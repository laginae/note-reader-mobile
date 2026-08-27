const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_SETTINGS,
  buildAzureEndpoint,
  buildAzureSsml,
  buildOpenRouterRequestBody,
  normalizeSettings,
  requireHttpsEndpoint,
} = require('../src/config');

test('defaults to local system speech and stores no credential value', () => {
  assert.equal(DEFAULT_SETTINGS.speechEngine, 'system');
  assert.equal(DEFAULT_SETTINGS.stripMarkdown, true);
  assert.equal(DEFAULT_SETTINGS.chunkLimits, '200,400,800');
  assert.equal(Object.keys(DEFAULT_SETTINGS).some((key) => /apiKey|subscriptionKey/i.test(key)), false);
});

test('OpenRouter requests always enforce ZDR and deny provider collection', () => {
  const body = buildOpenRouterRequestBody('academic text', {
    openRouterModel: 'hexgrad/kokoro-82m',
    openRouterVoice: 'bm_george',
    speed: 1.25,
  });
  assert.equal(body.provider.zdr, true);
  assert.equal(body.provider.data_collection, 'deny');
  assert.equal(body.input, 'academic text');
});

test('Azure endpoints and SSML are validated and escaped', () => {
  assert.equal(
    buildAzureEndpoint({ azureCloud: 'public', azureRegion: 'eastasia' }),
    'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1'
  );
  const ssml = buildAzureSsml('A < B & C', { azureVoice: 'en-GB-RyanNeural', speed: 1.2 });
  assert.match(ssml, /A &lt; B &amp; C/);
  assert.match(ssml, /rate="20%"/);
});

test('remote CosyVoice rejects plaintext HTTP endpoints', () => {
  assert.throws(() => requireHttpsEndpoint('http://example.com/tts'), /must use HTTPS/);
  assert.equal(requireHttpsEndpoint('https://example.com/tts'), 'https://example.com/tts');
});

test('normalization retains only secret names, not unknown raw fields', () => {
  const settings = normalizeSettings({
    azureSecretName: 'azure-speech-key',
    apiKey: 'must-not-be-copied',
    speed: 99,
  });
  assert.equal(settings.azureSecretName, 'azure-speech-key');
  assert.equal(settings.speed, 2);
  assert.equal(Object.prototype.hasOwnProperty.call(settings, 'apiKey'), false);
  assert.equal(normalizeSettings({ chunkLimits: 'invalid' }).chunkLimits, '200,400,800');
});
