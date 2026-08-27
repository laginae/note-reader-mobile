'use strict';

const DEFAULT_AZURE_VOICE = 'en-GB-RyanNeural';
const DEFAULT_OPENROUTER_MODEL = 'hexgrad/kokoro-82m';
const DEFAULT_OPENROUTER_VOICE = 'bm_george';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/audio/speech';
const ONLINE_CHUNK_LIMITS = [200, 400, 800];
const SPEECH_ENGINES = ['system', 'azure', 'openrouter', 'remote-cosyvoice'];

const MICROSOFT_VOICES = [
  ['zh-CN-XiaoxiaoNeural', 'Mandarin - Xiaoxiao (female)', '普通话 - 小晓（女声）'],
  ['zh-CN-XiaoyiNeural', 'Mandarin - Xiaoyi (female)', '普通话 - 小艺（女声）'],
  ['zh-CN-YunxiNeural', 'Mandarin - Yunxi (male)', '普通话 - 云希（男声）'],
  ['zh-CN-YunyangNeural', 'Mandarin - Yunyang (male)', '普通话 - 云扬（男声）'],
  ['en-US-JennyNeural', 'US English - Jenny (female)', '美式英语 - Jenny（女声）'],
  ['en-US-GuyNeural', 'US English - Guy (male)', '美式英语 - Guy（男声）'],
  ['en-GB-SoniaNeural', 'UK English - Sonia (female)', '英式英语 - Sonia（女声）'],
  ['en-GB-RyanNeural', 'UK English - Ryan (male)', '英式英语 - Ryan（男声）'],
];

const OPENROUTER_MODELS = [
  ['hexgrad/kokoro-82m', 'Kokoro 82M - low cost, broad voice choice', 'Kokoro 82M - 成本较低、音色丰富'],
  ['microsoft/mai-voice-2', 'Microsoft MAI-Voice-2 - expressive long-form voice', 'Microsoft MAI-Voice-2 - 表现力较强、适合长文'],
  ['microsoft/mai-voice-2-flash', 'Microsoft MAI-Voice-2 Flash - lower latency', 'Microsoft MAI-Voice-2 Flash - 延迟较低'],
  ['google/gemini-3.1-flash-tts-preview', 'Gemini 3.1 Flash TTS Preview - multilingual styles', 'Gemini 3.1 Flash TTS 预览版 - 多语言风格'],
];

const OPENROUTER_VOICES = {
  'hexgrad/kokoro-82m': [
    ['zf_xiaoxiao', 'Xiaoxiao (Chinese female)', '小晓（中文女声）'],
    ['zm_yunyang', 'Yunyang (Chinese male)', '云扬（中文男声）'],
    ['af_heart', 'Heart (US English female)', 'Heart（美式英语女声）'],
    ['am_michael', 'Michael (US English male)', 'Michael（美式英语男声）'],
    ['bf_emma', 'Emma (UK English female)', 'Emma（英式英语女声）'],
    ['bm_george', 'George (UK English male)', 'George（英式英语男声）'],
  ],
  'microsoft/mai-voice-2': [
    ['zh-CN-Bo:MAI-Voice-2', 'Bo (Mandarin male, compatibility preset)', 'Bo（普通话男声，兼容预设）'],
    ['zh-CN-Lan:MAI-Voice-2', 'Lan (Mandarin female, compatibility preset)', 'Lan（普通话女声，兼容预设）'],
    ['zh-CN-Mei:MAI-Voice-2', 'Mei (Mandarin female, compatibility preset)', 'Mei（普通话女声，兼容预设）'],
    ['en-US-Harper:MAI-Voice-2', 'Harper (US English)', 'Harper（美式英语）'],
    ['fr-FR-Soleil:MAI-Voice-2', 'Soleil (French)', 'Soleil（法语）'],
    ['de-DE-Klaus:MAI-Voice-2', 'Klaus (German)', 'Klaus（德语）'],
  ],
  'microsoft/mai-voice-2-flash': [
    ['en-US-Harper:MAI-Voice-2', 'Harper (US English)', 'Harper（美式英语）'],
    ['es-MX-Valeria:MAI-Voice-2', 'Valeria (Mexican Spanish)', 'Valeria（墨西哥西班牙语）'],
    ['fr-FR-Soleil:MAI-Voice-2', 'Soleil (French)', 'Soleil（法语）'],
    ['de-DE-Klaus:MAI-Voice-2', 'Klaus (German)', 'Klaus（德语）'],
  ],
  'google/gemini-3.1-flash-tts-preview': [
    ['Charon', 'Charon (informative)', 'Charon（信息型）'],
    ['Rasalgethi', 'Rasalgethi (informative)', 'Rasalgethi（信息型）'],
    ['Schedar', 'Schedar (even)', 'Schedar（平稳）'],
    ['Iapetus', 'Iapetus (clear)', 'Iapetus（清晰）'],
    ['Gacrux', 'Gacrux (mature)', 'Gacrux（成熟）'],
    ['Sulafat', 'Sulafat (warm)', 'Sulafat（温暖）'],
  ],
};

const DEFAULT_SETTINGS = Object.freeze({
  settingsLanguage: 'english',
  speechEngine: 'system',
  systemVoiceUri: '',
  azureConsent: false,
  azureCloud: 'public',
  azureRegion: 'eastasia',
  azureVoice: DEFAULT_AZURE_VOICE,
  azureSecretName: '',
  openRouterConsent: false,
  openRouterModel: DEFAULT_OPENROUTER_MODEL,
  openRouterVoice: DEFAULT_OPENROUTER_VOICE,
  openRouterSecretName: '',
  remoteConsent: false,
  remoteEndpoint: '',
  remoteVoice: '',
  remoteSecretName: '',
  speed: 1,
  chunkLimits: ONLINE_CHUNK_LIMITS.join(','),
  stripMarkdown: true,
  mathReadingLanguage: 'english',
  rememberReadingPosition: false,
  readingPositions: {},
});

function normalizeSpeechEngine(value) {
  const engine = String(value || '').trim().toLowerCase();
  return SPEECH_ENGINES.includes(engine) ? engine : DEFAULT_SETTINGS.speechEngine;
}

function normalizeSpeed(value) {
  const speed = Number(value);
  return Number.isFinite(speed) ? Math.max(0.5, Math.min(2, speed)) : 1;
}

function normalizeAzureRegion(value) {
  const region = String(value || '').trim().toLowerCase();
  return /^[a-z0-9-]{2,40}$/.test(region) ? region : '';
}

function normalizeAzureVoice(value) {
  const voice = String(value || '').trim();
  return /^[a-z]{2,3}-[a-z]{2}-[a-z0-9][a-z0-9._:-]{1,190}$/i.test(voice)
    ? voice
    : DEFAULT_AZURE_VOICE;
}

function normalizeOpenRouterModel(value) {
  const model = String(value || '').trim();
  return /^[a-z0-9][a-z0-9._-]{0,79}\/[a-z0-9][a-z0-9._-]{1,149}(?::[a-z0-9._-]+)?$/i.test(model)
    ? model
    : DEFAULT_OPENROUTER_MODEL;
}

function normalizeOpenRouterVoice(value) {
  const voice = String(value || '').trim();
  return /^[a-z0-9][a-z0-9._:-]{0,199}$/i.test(voice) ? voice : DEFAULT_OPENROUTER_VOICE;
}

function normalizeSecretName(value) {
  const name = String(value || '').trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) ? name : '';
}

function normalizeChunkLimits(value) {
  const limits = String(value || '')
    .split(',')
    .map((item) => Math.floor(Number(item.trim())))
    .filter((item) => Number.isFinite(item) && item > 0);
  return (limits.length ? limits : ONLINE_CHUNK_LIMITS).join(',');
}

function normalizeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    settingsLanguage: source.settingsLanguage === 'chinese' ? 'chinese' : 'english',
    speechEngine: normalizeSpeechEngine(source.speechEngine),
    systemVoiceUri: String(source.systemVoiceUri || '').trim().slice(0, 500),
    azureConsent: source.azureConsent === true,
    azureCloud: source.azureCloud === 'china' ? 'china' : 'public',
    azureRegion: normalizeAzureRegion(source.azureRegion) || DEFAULT_SETTINGS.azureRegion,
    azureVoice: normalizeAzureVoice(source.azureVoice),
    azureSecretName: normalizeSecretName(source.azureSecretName),
    openRouterConsent: source.openRouterConsent === true,
    openRouterModel: normalizeOpenRouterModel(source.openRouterModel),
    openRouterVoice: normalizeOpenRouterVoice(source.openRouterVoice),
    openRouterSecretName: normalizeSecretName(source.openRouterSecretName),
    remoteConsent: source.remoteConsent === true,
    remoteEndpoint: String(source.remoteEndpoint || '').trim().slice(0, 2048),
    remoteVoice: String(source.remoteVoice || '').trim().slice(0, 200),
    remoteSecretName: normalizeSecretName(source.remoteSecretName),
    speed: normalizeSpeed(source.speed),
    chunkLimits: normalizeChunkLimits(source.chunkLimits),
    stripMarkdown: source.stripMarkdown !== false,
    mathReadingLanguage: ['english', 'chinese', 'skip'].includes(source.mathReadingLanguage)
      ? source.mathReadingLanguage
      : DEFAULT_SETTINGS.mathReadingLanguage,
    rememberReadingPosition: source.rememberReadingPosition === true,
    readingPositions: source.readingPositions && typeof source.readingPositions === 'object'
      ? source.readingPositions
      : {},
  };
}

function buildAzureEndpoint(settings = {}) {
  const region = normalizeAzureRegion(settings.azureRegion);
  if (!region) {
    throw new Error('Set a valid Azure Speech region.');
  }
  const domain = settings.azureCloud === 'china'
    ? 'tts.speech.azure.cn'
    : 'tts.speech.microsoft.com';
  return `https://${region}.${domain}/cognitiveservices/v1`;
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildAzureSsml(text, settings = {}) {
  const voice = normalizeAzureVoice(settings.azureVoice);
  const locale = voice.split('-').slice(0, 2).join('-');
  const speed = normalizeSpeed(settings.speed);
  const rate = `${Math.round((speed - 1) * 100)}%`;
  return `<speak version="1.0" xml:lang="${locale}"><voice name="${escapeXml(voice)}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`;
}

function buildOpenRouterRequestBody(text, settings = {}) {
  return {
    model: normalizeOpenRouterModel(settings.openRouterModel),
    input: String(text || ''),
    voice: normalizeOpenRouterVoice(settings.openRouterVoice),
    response_format: 'mp3',
    speed: normalizeSpeed(settings.speed),
    provider: {
      data_collection: 'deny',
      zdr: true,
    },
  };
}

function requireHttpsEndpoint(value) {
  const endpoint = String(value || '').trim();
  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch (_error) {
    throw new Error('Set a valid HTTPS remote CosyVoice endpoint.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Remote CosyVoice must use HTTPS.');
  }
  return parsed.toString();
}

function getOpenRouterVoices(model) {
  return OPENROUTER_VOICES[normalizeOpenRouterModel(model)] || [];
}

function getDefaultOpenRouterVoice(model) {
  const voices = getOpenRouterVoices(model);
  return voices.length ? voices[0][0] : DEFAULT_OPENROUTER_VOICE;
}

module.exports = {
  DEFAULT_AZURE_VOICE,
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_OPENROUTER_VOICE,
  DEFAULT_SETTINGS,
  MICROSOFT_VOICES,
  ONLINE_CHUNK_LIMITS,
  OPENROUTER_ENDPOINT,
  OPENROUTER_MODELS,
  OPENROUTER_VOICES,
  buildAzureEndpoint,
  buildAzureSsml,
  buildOpenRouterRequestBody,
  escapeXml,
  getDefaultOpenRouterVoice,
  getOpenRouterVoices,
  normalizeAzureRegion,
  normalizeAzureVoice,
  normalizeChunkLimits,
  normalizeOpenRouterModel,
  normalizeOpenRouterVoice,
  normalizeSecretName,
  normalizeSettings,
  normalizeSpeechEngine,
  normalizeSpeed,
  requireHttpsEndpoint,
};
