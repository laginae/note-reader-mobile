const assert = require('node:assert/strict');
const test = require('node:test');
const { ELEVENLABS_MODELS, ELEVENLABS_VOICES } = require('../src/openrouter-elevenlabs');

test('ElevenLabs presets retain defaults, model-specific voices and fixed private MP3 requests', () => {
  assert.equal(DEFAULT_SETTINGS.openRouterModel, 'hexgrad/kokoro-82m');
  for (const [model] of ELEVENLABS_MODELS) {
    assert.equal(getDefaultOpenRouterVoice(model), 'sarah');
    assert.deepEqual(getOpenRouterVoices(model), ELEVENLABS_VOICES);
    const body = buildOpenRouterRequestBody('Public sample.', {
      openRouterModel:model, openRouterVoice:'sarah', speed:2, openRouterZdrOnly:false,
      previous_text:'must not send', next_text:'must not send', provider:{zdr:false}});
    assert.deepEqual(body, {model, voice:'sarah', input:'Public sample.', speed:1, response_format:'mp3',
      provider:{data_collection:'deny', zdr:true}});
  }
});

const {
  DEFAULT_SETTINGS,
  buildAzureEndpoint,
  buildAzureSsml,
  buildOpenRouterRequestBody,
  getDefaultOpenRouterVoice,
  getOpenRouterVoices,
  normalizeSettings,
  requireHttpsEndpoint,
} = require('../src/config');

test('defaults to local system speech and stores no credential value', () => {
  assert.equal(DEFAULT_SETTINGS.speechEngine, 'system');
  assert.equal(DEFAULT_SETTINGS.stripMarkdown, true);
  assert.equal(DEFAULT_SETTINGS.chunkLimits, '200,400,800');
  assert.equal(Object.keys(DEFAULT_SETTINGS).some((key) => /apiKey|subscriptionKey/i.test(key)), false);
});

test('PDF edge filtering defaults on for new and existing settings but can be disabled', () => {
  assert.equal(DEFAULT_SETTINGS.pdfSkipHeaders, true);
  assert.equal(normalizeSettings({}).pdfSkipHeaders, true);
  assert.equal(normalizeSettings({ pdfSkipHeaders: false }).pdfSkipHeaders, false);
});

test('OpenRouter model changes choose a documented female default while retaining male presets', () => {
  assert.equal(getDefaultOpenRouterVoice('hexgrad/kokoro-82m'), 'bf_emma');
  assert.equal(getDefaultOpenRouterVoice('microsoft/mai-voice-2'), 'en-US-Harper:MAI-Voice-2');
  assert.equal(
    getDefaultOpenRouterVoice('microsoft/mai-voice-2-flash'),
    'en-US-Harper:MAI-Voice-2'
  );
  assert.equal(getDefaultOpenRouterVoice('google/gemini-3.1-flash-tts-preview'), 'Sulafat');

  const kokoroVoices = getOpenRouterVoices('hexgrad/kokoro-82m');
  assert.ok(kokoroVoices.some(([voice]) => voice === 'am_michael'));
  assert.ok(kokoroVoices.some(([voice]) => voice === 'bm_george'));
  assert.ok(getOpenRouterVoices('microsoft/mai-voice-2').some(
    ([voice]) => voice === 'en-US-Ethan:MAI-Voice-2'
  ));
});

test('missing or malformed model-specific voices fall back to that model without altering saved voices', () => {
  const models=['hexgrad/kokoro-82m','microsoft/mai-voice-2','microsoft/mai-voice-2-flash',
    'google/gemini-3.1-flash-tts-preview',...ELEVENLABS_MODELS.map(([model])=>model)];
  for (const model of models) {
    const voice=getDefaultOpenRouterVoice(model);
    assert.ok(getOpenRouterVoices(model).some(([id])=>id===voice),model);
    for (const missing of [undefined,'','invalid voice']) {
      const settings=normalizeSettings({openRouterModel:model,openRouterVoice:missing});
      assert.equal(settings.openRouterVoice,voice,model);
      const request=buildOpenRouterRequestBody('Public sample.',{openRouterModel:model,openRouterVoice:missing});
      assert.equal(request.voice,voice,model); assert.deepEqual(request.provider,{data_collection:'deny',zdr:true});
    }
  }
  const legacy=normalizeSettings({azureVoice:'en-GB-RyanNeural',mimoVoice:'白桦',openRouterModel:'hexgrad/kokoro-82m',
    openRouterVoice:'bm_george',mimoConsent:true,openRouterConsent:true});
  assert.equal(legacy.azureVoice,'en-GB-RyanNeural'); assert.equal(legacy.mimoVoice,'白桦');
  assert.equal(legacy.openRouterVoice,'bm_george'); assert.equal(legacy.mimoConsent,true); assert.equal(legacy.openRouterConsent,true);
  assert.equal(normalizeSettings({}).azureVoice,'en-GB-SoniaNeural');
  assert.equal(normalizeSettings({}).systemVoiceUri,'');
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
  assert.match(ssml, /rate="0%"/);
});

test('MiMo defaults and volume are bounded, BYOK raw secrets are discarded', () => {
  const s = normalizeSettings({speechEngine: 'mimo', volume: -3, mimoVoice: 'unknown', byokProfile: {apiKey: 'discard-me'}});
  assert.equal(s.mimoVoice, '冰糖');
  assert.equal(s.mimoConsent, false);
  assert.equal(s.volume, 0);
  assert.equal(s.byokProfile.apiKey, undefined);
  assert.equal(buildOpenRouterRequestBody('text', {speed: 2}).speed, 1);
});

test('custom remote URLs reject embedded secrets and ambiguous destinations', () => {
  for (const url of ['https://user:password@example.com/tts', 'https://example.com/tts?key=secret', 'https://example.com/tts#voice']) {
    assert.throws(() => requireHttpsEndpoint(url));
  }
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
