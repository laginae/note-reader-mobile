'use strict';
const MAX_EXPORT_BYTES = 32 * 1024 * 1024;
const MAX_EXPORT_CHARS = 30_000;
const EXPORT_FOLDER = 'Note Reader Audio';

function monoPcm(audio, maximumBytes) {
  if (!Number.isInteger(audio.length) || audio.length < 1 || audio.length * 2 > maximumBytes
    || !Number.isInteger(audio.numberOfChannels) || audio.numberOfChannels < 1 || audio.numberOfChannels > 8) {
    throw new Error('Audio export exceeds the mobile limit. Export a shorter selection or section. / 请缩小导出范围。');
  }
  const channels = Array.from({ length: audio.numberOfChannels }, (_, n) => audio.getChannelData(n));
  const bytes = new Uint8Array(audio.length * 2), view = new DataView(bytes.buffer);
  for (let i = 0; i < audio.length; i++) {
    let sample = 0;
    for (const channel of channels) sample += Number.isFinite(channel[i]) ? channel[i] / channels.length : 0;
    sample = Math.max(-1, Math.min(1, sample));
    view.setInt16(i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return bytes;
}
function wavBytes(parts, sampleRate, maximumBytes = MAX_EXPORT_BYTES) {
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  if (!length || length + 44 > maximumBytes || !Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Invalid or oversized WAV export.');
  const output = new Uint8Array(44 + length), view = new DataView(output.buffer);
  const word = (offset, text) => { for (let i = 0; i < text.length; i++) output[offset + i] = text.charCodeAt(i); };
  word(0, 'RIFF'); view.setUint32(4, 36 + length, true); word(8, 'WAVE'); word(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); word(36, 'data'); view.setUint32(40, length, true);
  let offset = 44;
  for (const part of parts) { output.set(part, offset); offset += part.byteLength; }
  return output.buffer;
}
async function synthesizeWav(texts, { synthesize, decoder, cancelled = () => false, progress = () => {}, maxBytes = MAX_EXPORT_BYTES }) {
  const check = () => { if (cancelled()) throw new Error('Export cancelled.'); };
  const parts = []; let length = 44, rate = null;
  try {
    if (!texts.length || texts.reduce((n, text) => n + text.length, 0) > MAX_EXPORT_CHARS) throw new Error('Choose a shorter reading range (maximum 30,000 characters). / 导出范围最多 30,000 字符。');
    for (let i = 0; i < texts.length; i++) {
      check(); progress(i, texts.length);
      const result = await synthesize(texts[i]); check();
      const audio = await decoder.decodeAudioData(result.arrayBuffer.slice(0)); check();
      if (rate !== null && rate !== audio.sampleRate) throw new Error('Decoded audio rates differ.');
      rate = audio.sampleRate;
      const part = monoPcm(audio, maxBytes - length); length += part.byteLength; parts.push(part);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    check(); progress(texts.length, texts.length);
    return wavBytes(parts, rate, maxBytes);
  } finally { parts.length = 0; await decoder.close?.(); }
}
async function saveExport(vault, name, bytes, cancelled = () => false) {
  const check = () => { if (cancelled()) throw new Error('Export cancelled.'); };
  check();
  let folder = vault.getAbstractFileByPath(EXPORT_FOLDER);
  if (!folder) {
    try { await vault.createFolder(EXPORT_FOLDER); } catch (error) { if (!vault.getAbstractFileByPath(EXPORT_FOLDER)) throw error; }
    folder = vault.getAbstractFileByPath(EXPORT_FOLDER);
  }
  if (!folder || !Array.isArray(folder.children)) throw new Error('The export folder path is occupied by a file.');
  const base = `reading-${String(name || 'audio').replace(/\.wav$/i, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim().slice(0, 80).replace(/[. ]+$/, '') || 'audio'}`;
  for (let n = 0; n < 100; n++) {
    const path = `${EXPORT_FOLDER}/${base}${n ? `-${n}` : ''}.wav`;
    if (vault.getAbstractFileByPath(path)) continue;
    check();
    await vault.createBinary(path, bytes);
    return path;
  }
  throw new Error('Too many files with this name. Choose another name.');
}
module.exports = { MAX_EXPORT_BYTES, MAX_EXPORT_CHARS, EXPORT_FOLDER, monoPcm, wavBytes, synthesizeWav, saveExport };
