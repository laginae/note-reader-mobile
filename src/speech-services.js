'use strict';

const { requestUrl } = require('obsidian');
const {
  OPENROUTER_ENDPOINT,
  MIMO_ENDPOINT,
  normalizeSettings,
  buildAzureEndpoint,
  buildAzureSsml,
  buildOpenRouterRequestBody,
  requireHttpsEndpoint,
} = require('./config');
const { MAX_AUDIO_BYTES, bytesOf, asAudio, decodeMimoAudio, decodeMinimaxAudio } = require('./audio-data');
const { buildByokRequest, hasByokConsent, byokConsentFingerprint, getByokConfigurationError } = require('./byok');
const REQUEST_TIMEOUT_MS = 90000;

// Custom destinations use fail-closed redirects. Never fall back to a transport
// that could forward credentials to another origin when CORS rejects a request.
async function guardedFetch(request, fetchFn = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let reader;
  try {
    const response = await fetchFn(request.url, { method: 'POST', headers: request.headers, body: request.body,
      credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal });
    if (!response.ok) return { status: response.status, headers: {}, arrayBuffer: new ArrayBuffer(0) };
    const declared = Number(response.headers.get('content-length'));
    if (declared > MAX_AUDIO_BYTES) throw new Error('Response too large.');
    if (!response.body?.getReader) throw new Error('Bounded response streaming unavailable.');
    reader = response.body.getReader();
    const parts = []; let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_AUDIO_BYTES) throw new Error('Response too large.');
      parts.push(part.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    return { status: response.status, headers: { 'content-type': response.headers.get('content-type') || '' }, arrayBuffer: bytes.buffer };
  } finally {
    clearTimeout(timer);
    if (reader) { try { await reader.cancel(); } catch {} }
    controller.abort();
  }
}

async function postResponse(request, label, requestFn) {
  let timer;
  let response;
  try {
    response = await Promise.race([
      requestFn({ ...request, method: 'POST', throw: false }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), REQUEST_TIMEOUT_MS); }),
    ]);
  } catch {
    throw new Error(`${label}: request failed or timed out. Check network, HTTPS endpoint and CORS support. No automatic retry. / 请求失败或超时；请检查网络、HTTPS 地址和 CORS 支持，未自动重试。`);
  } finally { clearTimeout(timer); }
  if (!Number.isInteger(response?.status) || response.status < 200 || response.status >= 300) throw createHttpError(response?.status, label);
  bytesOf(response.arrayBuffer);
  return response;
}

function readSecret(app, name, serviceLabel) {
  const secretName = String(name || '').trim();
  if (!secretName) {
    throw new Error(`Select or create an Obsidian secret for ${serviceLabel}.`);
  }
  if (!app || !app.secretStorage || typeof app.secretStorage.getSecret !== 'function') {
    throw new Error('Obsidian SecretStorage is unavailable. Update Obsidian and try again.');
  }
  let value;
  try {
    value = app.secretStorage.getSecret(secretName);
  } catch (_error) {
    throw new Error(`Could not read the ${serviceLabel} secret.`);
  }
  const secret = String(value || '').replace(/^\uFEFF/, '').trim();
  if (!secret || /[\r\n]/.test(secret)) {
    throw new Error(`${serviceLabel} secret must contain exactly one non-empty line.`);
  }
  return secret;
}

function createHttpError(status, serviceLabel) {
  const code = Math.floor(Number(status) || 0);
  if (code === 401) {
    return new Error(`${serviceLabel} rejected the credential (HTTP 401). Check the selected secret.`);
  }
  if (code === 402) {
    return new Error(`${serviceLabel} reported insufficient balance or quota (HTTP 402). No further chunks were sent.`);
  }
  if (code === 403) {
    return new Error(`${serviceLabel} denied this model, voice, region, or privacy route (HTTP 403).`);
  }
  if (code === 429) {
    return new Error(`${serviceLabel} rate or quota limit was reached (HTTP 429). Wait or check the account limit.`);
  }
  if (code >= 500) {
    return new Error(`${serviceLabel} is temporarily unavailable (HTTP ${code}). This chunk was not played.`);
  }
  return new Error(`${serviceLabel} returned HTTP ${code || 'error'}.`);
}

async function postForAudio(request, serviceLabel, requestFn = requestUrl) {
  const response = await postResponse(request, serviceLabel, requestFn);
  const bytes = bytesOf(response.arrayBuffer);
  const wav = bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF';
  return asAudio(bytes, wav);
}

async function synthesizeAzure(text, settings, app, requestFn) {
  if (settings.azureConsent !== true) {
    throw new Error('Enable Azure online processing in settings before sending text.');
  }
  const key = readSecret(app, settings.azureSecretName, 'Azure Speech');
  return postForAudio({
    url: buildAzureEndpoint(settings),
    headers: {
      'Content-Type': 'application/ssml+xml',
      'Ocp-Apim-Subscription-Key': key,
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
    },
    body: buildAzureSsml(text, settings),
  }, 'Azure Speech', requestFn);
}

async function synthesizeOpenRouter(text, settings, app, requestFn) {
  if (settings.openRouterConsent !== true) {
    throw new Error('Enable OpenRouter online processing in settings before sending text.');
  }
  const key = readSecret(app, settings.openRouterSecretName, 'OpenRouter API');
  return postForAudio({
    url: OPENROUTER_ENDPOINT,
    headers: {
      Accept: 'audio/mpeg',
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/laginae/note-reader-mobile',
      'X-Title': 'Note and PDF Voice Reader Mobile',
    },
    body: JSON.stringify(buildOpenRouterRequestBody(text, settings)),
  }, 'OpenRouter TTS', requestFn);
}

async function synthesizeRemoteCosyVoice(text, settings, app, requestFn = guardedFetch) {
  if (settings.remoteConsent !== true) {
    throw new Error('Enable remote CosyVoice processing in settings before sending text.');
  }
  const endpoint = requireHttpsEndpoint(settings.remoteEndpoint);
  const headers = {
    Accept: 'audio/mpeg, audio/wav',
    'Content-Type': 'application/json',
  };
  if (settings.remoteSecretName) {
    headers.Authorization = `Bearer ${readSecret(app, settings.remoteSecretName, 'remote CosyVoice')}`;
  }
  return postForAudio({
    url: endpoint,
    headers,
    body: JSON.stringify({
      input: String(text || ''),
      response_format: 'mp3',
      speed: 1,
      voice: String(settings.remoteVoice || '').trim(),
    }),
  }, 'Remote CosyVoice', requestFn);
}

async function synthesizeMimo(text, settings, app, requestFn = requestUrl) {
  if (!settings.mimoConsent) throw new Error('Enable MiMo online processing before sending text. / 请先允许 MiMo 在线处理。');
  if (!text.trim() || text.length > 200) throw new Error('MiMo chunks must contain 1 to 200 characters. / MiMo 分段须为 1 至 200 字符。');
  const key = readSecret(app, settings.mimoSecretName, 'MiMo');
  const response = await postResponse({ url: MIMO_ENDPOINT, headers: { 'Content-Type': 'application/json', 'api-key': key },
    body: JSON.stringify({ model: 'mimo-v2.5-tts', messages: [
      { role: 'user', content: 'Read the supplied text faithfully at normal speed. Do not summarize or add words.' },
      { role: 'assistant', content: text },
    ], audio: { format: 'wav', voice: settings.mimoVoice }, stream: false }) }, 'MiMo', requestFn);
  return decodeMimoAudio(response.arrayBuffer);
}

async function synthesizeByok(text, settings, app, requestFn = guardedFetch) {
  const profile = settings.byokProfile;
  const error = getByokConfigurationError(profile);
  if (error) throw new Error(error);
  const key = readSecret(app, profile?.secretName, 'BYOK');
  const request = buildByokRequest(profile, text, key);
  const response = await postResponse(request, 'BYOK', requestFn);
  return profile.provider === 'minimax' ? decodeMinimaxAudio(response.arrayBuffer) : asAudio(response.arrayBuffer);
}

function onlineConfiguration(settings) {
  const s = normalizeSettings(settings);
  const engine = s.speechEngine;
  if (engine === 'byok') return JSON.stringify([engine, byokConsentFingerprint(s.byokProfile), hasByokConsent(s.byokProfile)]);
  const prefix = engine === 'remote-cosyvoice' ? 'remote' : engine === 'openrouter' ? 'openRouter' : engine;
  return JSON.stringify([engine, Object.keys(s).filter(key => key.startsWith(prefix)).sort().map(key => [key, s[key]])]);
}

async function synthesizeOnlineChunk(text, settings, app, requestFn, getCurrentSettings = () => settings) {
  const snapshot = normalizeSettings(settings);
  const signature = onlineConfiguration(snapshot);
  const assertCurrent = () => {
    if (signature !== onlineConfiguration(getCurrentSettings())) throw new Error('Speech configuration or consent changed; playback stopped. / 语音配置或授权已更改，已停止播放。');
  };
  assertCurrent();
  if (typeof text !== 'string' || !text.trim() || text.length > (snapshot.speechEngine === 'mimo' ? 200 : 800)) throw new Error('Text exceeds this engine\'s chunk limit. / 文本超出当前引擎分段上限。');
  const engines = { azure: synthesizeAzure, openrouter: synthesizeOpenRouter, mimo: synthesizeMimo, byok: synthesizeByok, 'remote-cosyvoice': synthesizeRemoteCosyVoice };
  if (!Object.hasOwn(engines, snapshot.speechEngine)) throw new Error('The selected engine does not use an online audio endpoint.');
  const audio = await engines[snapshot.speechEngine](text, snapshot, app, requestFn);
  assertCurrent();
  return audio;
}

module.exports = {
  MAX_AUDIO_BYTES,
  guardedFetch,
  onlineConfiguration,
  synthesizeMimo,
  synthesizeByok,
  createHttpError,
  postForAudio,
  readSecret,
  synthesizeAzure,
  synthesizeOnlineChunk,
  synthesizeOpenRouter,
  synthesizeRemoteCosyVoice,
};
