'use strict';

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const ascii = (bytes, from, count) => String.fromCharCode(...bytes.subarray(from, from + count));

function bytesOf(value) {
  const bytes = value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : null;
  if (!bytes || !bytes.length) throw new Error('The service returned an empty audio response.');
  if (bytes.length > MAX_AUDIO_BYTES) throw new Error('The service returned more than 20 MB for one chunk.');
  return bytes;
}

function validateWave(value) {
  const bytes = bytesOf(value);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 44 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WAVE'
    || view.getUint32(4, true) + 8 !== bytes.length) throw new Error('Invalid or truncated WAV audio. / WAV 音频无效或不完整。');
  let format = null, dataSize = 0, offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4), size = view.getUint32(offset + 4, true), start = offset + 8;
    if (start + size > bytes.length) throw new Error('Truncated WAV data.');
    if (type === 'fmt ') {
      if (size < 16) throw new Error('Invalid WAV format.');
      format = { code: view.getUint16(start, true), channels: view.getUint16(start + 2, true),
        sampleRate: view.getUint32(start + 4, true), block: view.getUint16(start + 12, true), bits: view.getUint16(start + 14, true) };
      if (format.code === 0xfffe) {
        // WAVE_FORMAT_EXTENSIBLE wraps the standard PCM/IEEE-float GUID.
        if (size < 40 || view.getUint16(start + 16, true) < 22) throw new Error('Invalid extensible WAV format.');
        const validBits = view.getUint16(start + 18, true);
        const guidTail = [0, 0, 16, 0, 128, 0, 0, 170, 0, 56, 155, 113];
        if (validBits < 1 || validBits > format.bits || !guidTail.every((byte, index) => bytes[start + 28 + index] === byte)) throw new Error('Unsupported extensible WAV subtype.');
        format.code = view.getUint32(start + 24, true);
      }
    }
    if (type === 'data') dataSize += size;
    offset = start + size + (size % 2);
  }
  if (offset !== bytes.length || !format || ![1, 3].includes(format.code) || !format.channels || !format.sampleRate
    || ![8, 16, 24, 32, 64].includes(format.bits) || (format.code === 3 && ![32, 64].includes(format.bits)) || format.block !== format.channels * format.bits / 8
    || !dataSize || dataSize % format.block) throw new Error('Invalid or incomplete WAV samples.');
  return bytes;
}

function validateMp3(value) {
  const bytes = bytesOf(value);
  let offset = 0, frames = 0;
  if (ascii(bytes, 0, 3) === 'ID3') {
    if (bytes.length < 10 || bytes[6] & 128 || bytes[7] & 128 || bytes[8] & 128 || bytes[9] & 128) throw new Error('Invalid MP3 metadata.');
    offset = 10 + ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9]);
    if (bytes[3] === 4 && (bytes[5] & 16)) offset += 10;
  }
  while (offset + 4 <= bytes.length) {
    if (bytes.length - offset === 128 && ascii(bytes, offset, 3) === 'TAG') { offset += 128; break; }
    const a = bytes[offset], b = bytes[offset + 1], c = bytes[offset + 2];
    const version = (b >> 3) & 3, layer = (b >> 1) & 3, bitrateIndex = c >> 4, rateIndex = (c >> 2) & 3;
    if (a !== 255 || (b & 224) !== 224 || version === 1 || layer !== 1 || !bitrateIndex || bitrateIndex === 15 || rateIndex === 3) break;
    const rates = version === 3 ? [44100, 48000, 32000] : version === 2 ? [22050, 24000, 16000] : [11025, 12000, 8000];
    const bitrates = version === 3 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    const size = Math.floor((version === 3 ? 144000 : 72000) * bitrates[bitrateIndex] / rates[rateIndex]) + ((c >> 1) & 1);
    if (offset + size > bytes.length) throw new Error('Truncated MP3 audio. / MP3 音频不完整。');
    offset += size; frames++;
  }
  if (!frames || (offset !== bytes.length && !bytes.subarray(offset).every(byte => byte === 0))) throw new Error('The service did not return valid MP3 audio. / 服务未返回有效 MP3 音频。');
  return bytes;
}

function asAudio(value, wav = false) {
  const bytes = wav ? validateWave(value) : validateMp3(value);
  return { arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), mimeType: wav ? 'audio/wav' : 'audio/mpeg' };
}

function parseJsonAudio(value, label) {
  try { return JSON.parse(new TextDecoder().decode(bytesOf(value))); }
  catch { throw new Error(`${label}: invalid audio response. / 音频响应格式无效。`); }
}

function decodeMimoAudio(value) {
  const response = parseJsonAudio(value, 'MiMo');
  const choice = response.choices?.[0];
  if (response.error || choice?.finish_reason !== 'stop') throw new Error('MiMo did not confirm complete generation. Reading stopped without advancing; try shorter chunks. / MiMo 未确认生成完整音频，已停止且不跳段，请缩短分段后重试。');
  const data = choice?.message?.audio?.data;
  if (typeof data !== 'string' || !data.length || data.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error('MiMo: invalid base64 audio.');
  let decoded;
  try { decoded = Uint8Array.from(atob(data), char => char.charCodeAt(0)); }
  catch { throw new Error('MiMo: invalid base64 audio.'); }
  return asAudio(decoded, true);
}

function decodeMinimaxAudio(value) {
  const response = parseJsonAudio(value, 'MiniMax');
  const code = response.base_resp?.status_code;
  if (code !== 0) {
    const detail = code === 1008 ? 'Insufficient balance / 余额不足' : code === 1002 ? 'Rate limit / 请求频率超限' : code === 1004 ? 'Authentication failed / 认证失败' : 'Provider rejected the request / 服务拒绝请求';
    throw new Error(`MiniMax: ${detail}. No automatic retry.`);
  }
  const hex = response.data?.audio;
  if (response.data?.status !== 2 || typeof hex !== 'string' || !hex.length || hex.length % 2 || !/^[a-f0-9]+$/i.test(hex)) throw new Error('MiniMax: incomplete inline audio. / 内嵌音频不完整。');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return asAudio(bytes);
}

module.exports = { MAX_AUDIO_BYTES, bytesOf, validateWave, validateMp3, asAudio, decodeMimoAudio, decodeMinimaxAudio };
