'use strict';

const { requestUrl } = require('obsidian');
const {
  OPENROUTER_ENDPOINT,
  buildAzureEndpoint,
  buildAzureSsml,
  buildOpenRouterRequestBody,
  normalizeSpeed,
  requireHttpsEndpoint,
} = require('./config');

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

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

function getHeader(headers, name) {
  const source = headers && typeof headers === 'object' ? headers : {};
  const key = Object.keys(source).find((entry) => entry.toLowerCase() === name.toLowerCase());
  return key ? String(source[key] || '') : '';
}

async function postForAudio(request, serviceLabel, requestFn = requestUrl) {
  let response;
  try {
    response = await requestFn({
      ...request,
      method: 'POST',
      throw: false,
    });
  } catch (_error) {
    throw new Error(`${serviceLabel} could not be reached. Check the network and endpoint.`);
  }
  const status = Number(response && response.status);
  if (status < 200 || status >= 300) {
    throw createHttpError(status, serviceLabel);
  }
  const arrayBuffer = response && response.arrayBuffer;
  const byteLength = arrayBuffer && Number(arrayBuffer.byteLength);
  if (!arrayBuffer || !Number.isFinite(byteLength) || byteLength <= 0) {
    throw new Error(`${serviceLabel} returned an empty audio response.`);
  }
  if (byteLength > MAX_AUDIO_BYTES) {
    throw new Error(`${serviceLabel} returned more than 20 MB for one chunk.`);
  }
  return {
    arrayBuffer,
    mimeType: getHeader(response.headers, 'content-type').split(';')[0].trim() || 'audio/mpeg',
  };
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

async function synthesizeRemoteCosyVoice(text, settings, app, requestFn) {
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
      speed: normalizeSpeed(settings.speed),
      voice: String(settings.remoteVoice || '').trim(),
    }),
  }, 'Remote CosyVoice', requestFn);
}

async function synthesizeOnlineChunk(text, settings, app, requestFn = requestUrl) {
  if (settings.speechEngine === 'azure') {
    return synthesizeAzure(text, settings, app, requestFn);
  }
  if (settings.speechEngine === 'openrouter') {
    return synthesizeOpenRouter(text, settings, app, requestFn);
  }
  if (settings.speechEngine === 'remote-cosyvoice') {
    return synthesizeRemoteCosyVoice(text, settings, app, requestFn);
  }
  throw new Error('The selected engine does not use an online audio endpoint.');
}

module.exports = {
  MAX_AUDIO_BYTES,
  createHttpError,
  postForAudio,
  readSecret,
  synthesizeAzure,
  synthesizeOnlineChunk,
  synthesizeOpenRouter,
  synthesizeRemoteCosyVoice,
};
