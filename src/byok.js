'use strict';

const BYOK_PROVIDERS = Object.freeze({
  'openai-compatible': { name: 'OpenAI-compatible', endpoint: 'https://api.openai.com/v1/audio/speech', model: 'gpt-4o-mini-tts', voice: 'onyx', docs: 'https://developers.openai.com/api/docs/guides/text-to-speech' },
  elevenlabs: { name: 'ElevenLabs', endpoint: 'https://api.elevenlabs.io/v1/text-to-speech', model: 'eleven_multilingual_v2', voice: '', docs: 'https://elevenlabs.io/docs/api-reference/text-to-speech/convert' },
  minimax: { name: 'MiniMax', endpoint: 'https://api.minimax.io/v1/t2a_v2', model: 'speech-2.8-hd', voice: '', docs: 'https://platform.minimax.io/docs/api-reference/speech-t2a-http' },
});
const clean = (value, limit = 256) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

function normalizeByokProfile(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  const provider = Object.hasOwn(BYOK_PROVIDERS, value.provider) ? value.provider : 'openai-compatible';
  const preset = BYOK_PROVIDERS[provider];
  return { provider, endpoint: clean(value.endpoint ?? preset.endpoint, 2048),
    model: clean(value.model ?? preset.model), voice: clean(value.voice ?? preset.voice),
    secretName: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.secretName || '') ? value.secretName : '',
    consent: clean(value.consent, 4096) };
}

function validateByokEndpoint(profile) {
  let url;
  try { url = new URL(profile.endpoint); } catch { throw new Error('BYOK: enter a complete HTTPS speech endpoint. / 请填写完整 HTTPS 语音接口地址。'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || /[\s\\]/.test(profile.endpoint)) {
    throw new Error('BYOK: HTTPS only; no embedded credentials, query or fragment. / 地址须为 HTTPS，不能嵌入密钥、查询参数或片段。');
  }
  if (!Object.hasOwn(BYOK_PROVIDERS, profile.provider)) throw new Error('BYOK: unsupported API type. / 不支持的接口类型。');
  if (profile.provider === 'elevenlabs' && url.href !== BYOK_PROVIDERS.elevenlabs.endpoint) throw new Error('BYOK: use the official ElevenLabs preset endpoint.');
  if (profile.provider === 'minimax' && !['https://api.minimax.io/v1/t2a_v2', 'https://api.minimaxi.com/v1/t2a_v2'].includes(url.href)) throw new Error('BYOK: use the MiniMax international or China preset endpoint.');
  return url.href;
}

// A consent record binds the visible configuration, not the credential value.
// It is not a cryptographic guarantee or a provider privacy certification.
function byokConsentFingerprint(profile) {
  try {
    return JSON.stringify(['mobile-byok-v1', profile.provider, validateByokEndpoint(profile), profile.model, profile.voice, profile.secretName]);
  } catch { return ''; }
}

function hasByokConsent(profile) {
  const fingerprint = byokConsentFingerprint(profile);
  return Boolean(fingerprint && fingerprint === profile.consent);
}

function getByokConfigurationError(profile, requireConsent = true) {
  if (!profile) return 'BYOK: configure a speech API first. / 请先配置语音接口。';
  try { validateByokEndpoint(profile); } catch (error) { return error.message; }
  if (!profile.model || !profile.voice || /[\r\n]/.test(profile.model + profile.voice)) return 'BYOK: enter a model and voice ID. / 请填写模型和音色 ID。';
  if (!profile.secretName) return 'BYOK: select an Obsidian secret. / 请选择 Obsidian 秘密。';
  if (requireConsent && !hasByokConsent(profile)) return 'BYOK: confirm processing and billing risks for this configuration. / 请确认此配置的数据处理及费用风险。';
  return '';
}

function grantByokConsent(value) {
  const profile = normalizeByokProfile(value);
  const error = getByokConfigurationError(profile, false);
  if (error) throw new Error(error);
  return { ...profile, consent: byokConsentFingerprint(profile) };
}

function updateByokProfile(profile, patch) {
  const next = normalizeByokProfile({ ...profile, ...patch });
  if (next.endpoint !== profile.endpoint || next.provider !== profile.provider) next.secretName = '';
  if (byokConsentFingerprint(next) !== byokConsentFingerprint(profile)) next.consent = '';
  return next;
}

function buildByokRequest(profile, text, apiKey) {
  const error = getByokConfigurationError(profile);
  if (error) throw new Error(error);
  if (!apiKey || /[\r\n]/.test(apiKey)) throw new Error('BYOK: invalid credential.');
  if (typeof text !== 'string' || !text.trim() || text.length > 800) throw new Error('BYOK: empty text or chunk exceeds 800 characters.');
  let url = validateByokEndpoint(profile);
  const headers = { 'Content-Type': 'application/json', Accept: profile.provider === 'minimax' ? 'application/json' : 'audio/mpeg' };
  let body;
  if (profile.provider === 'elevenlabs') {
    url += `/${encodeURIComponent(profile.voice)}?output_format=mp3_44100_128`;
    headers['xi-api-key'] = apiKey;
    body = { text, model_id: profile.model };
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
    body = profile.provider === 'minimax'
      ? { model: profile.model, text, stream: false, voice_setting: { voice_id: profile.voice, speed: 1 }, audio_setting: { format: 'mp3', sample_rate: 32000, bitrate: 128000, channel: 1 }, output_format: 'hex' }
      : { model: profile.model, input: text, voice: profile.voice, response_format: 'mp3', speed: 1 };
  }
  return { url, headers, body: JSON.stringify(body) };
}

module.exports = { BYOK_PROVIDERS, normalizeByokProfile, validateByokEndpoint, byokConsentFingerprint,
  hasByokConsent, getByokConfigurationError, grantByokConsent, updateByokProfile, buildByokRequest };
