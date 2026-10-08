const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');
const {mp3, wave, jsonBytes, base64} = require('./audio-fixtures.cjs');
const {normalizeSettings} = require('../src/config');
const {grantByokConsent, normalizeByokProfile} = require('../src/byok');

const originalLoad = Module._load;
Module._load = function loadWithObsidianMock(request, parent, isMain) {
  if (request === 'obsidian') {
    return { requestUrl: async () => ({}) };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  createHttpError,
  postForAudio,
  synthesizeOpenRouter,
  synthesizeOnlineChunk,
  guardedFetch,
} = require('../src/speech-services');
Module._load = originalLoad;

test('ElevenLabs privacy-route rejection never retries with weaker flags or exposes server text', async () => {
  for (const status of [403, 404]) {
    let count = 0;
    await assert.rejects(synthesizeOpenRouter('Public sample.', {
      openRouterConsent:true, openRouterSecretName:'speech-key',
      openRouterModel:'elevenlabs/eleven-v4', openRouterVoice:'george', speed:2,
    }, {secretStorage:{getSecret:()=> 'test-key'}}, async request => {
      count++;
      const body = JSON.parse(request.body);
      assert.equal(body.provider.zdr, true);
      assert.equal(body.provider.data_collection, 'deny');
      assert.equal(body.speed, 1);
      return {status, arrayBuffer:jsonBytes({error:'private echoed response'}), headers:{}};
    }), error => !error.message.includes('private echoed'));
    assert.equal(count, 1);
  }
});

test('OpenRouter forwards bounded opt-in context only for supported models and keeps ZDR', async () => {
  const { buildOpenRouterRequestBody } = require('../src/config');
  const context = { previous:'Previous sentence.', next:'Next sentence.' };
  const settings = { openRouterModel:'elevenlabs/eleven-v4', openRouterContext:true };
  const body = buildOpenRouterRequestBody('Current.', settings, context);
  assert.deepEqual(body.provider, { data_collection:'deny', zdr:true, options:{elevenlabs:{previous_text:context.previous, next_text:context.next}} });
  assert.deepEqual(buildOpenRouterRequestBody('Current.', {...settings, openRouterModel:'hexgrad/kokoro-82m'}, context).provider, {data_collection:'deny', zdr:true});
});

test('quota errors are explicit', () => {
  assert.match(createHttpError(402, 'OpenRouter TTS').message, /insufficient balance or quota/);
  assert.match(createHttpError(429, 'OpenRouter TTS').message, /rate or quota limit/);
});

test('audio requests reject oversized responses', async () => {
  await assert.rejects(
    () => postForAudio(
      { url: 'https://example.com' },
      'Test TTS',
      async () => ({ status: 200, arrayBuffer: new Uint8Array(21 * 1024 * 1024).buffer, headers: {} })
    ),
    /more than 20 MB/
  );
});

test('OpenRouter sends only ZDR requests and reads a named Obsidian secret', async () => {
  let captured = null;
  const app = { secretStorage: { getSecret: (name) => name === 'openrouter-key' ? 'secret-value' : '' } };
  const result = await synthesizeOpenRouter('text', {
    speechEngine: 'openrouter',
    openRouterConsent: true,
    openRouterSecretName: 'openrouter-key',
    openRouterModel: 'hexgrad/kokoro-82m',
    openRouterVoice: 'bm_george',
    speed: 1,
  }, app, async (request) => {
    captured = request;
    return {
      status: 200,
      arrayBuffer: mp3().buffer,
      headers: { 'content-type': 'audio/mpeg' },
    };
  });

  const body = JSON.parse(captured.body);
  assert.equal(body.provider.zdr, true);
  assert.equal(body.provider.data_collection, 'deny');
  assert.equal(captured.headers.Authorization, 'Bearer secret-value');
  assert.equal(result.mimeType, 'audio/mpeg');
});

const app = {secretStorage: {getSecret: () => 'test-credential'}};
const response = bytes => ({status: 200, arrayBuffer: bytes, headers: {}});

test('MiMo sends the complete assistant text, normal speed and selected voice', async () => {
  let request;
  const settings = normalizeSettings({speechEngine: 'mimo', mimoConsent: true, mimoSecretName: 'mimo-key', speed: 2});
  const text = 'A short sentence. 最后一句也应保留。';
  const result = await synthesizeOnlineChunk(text, settings, app, async value => {
    request = value;
    return response(jsonBytes({choices:[{finish_reason:'stop',message:{audio:{data:base64(wave())}}}]}));
  });
  const body = JSON.parse(request.body);
  assert.equal(body.messages[1].content, text);
  assert.equal(body.audio.voice, '白桦');
  assert.equal(body.stream, false);
  assert.equal(result.mimeType, 'audio/wav');
  assert.equal(request.headers['api-key'], 'test-credential');
});

test('MiMo rejects incomplete generation without exposing provider response text', async () => {
  const settings = normalizeSettings({speechEngine:'mimo',mimoConsent:true,mimoSecretName:'mimo-key'});
  await assert.rejects(synthesizeOnlineChunk('text',settings,app,async()=>response(jsonBytes({choices:[{finish_reason:'length',message:{content:'private echo',audio:{data:base64(wave())}}}]}))), error => /without advancing/.test(error.message) && !/private echo/.test(error.message));
});

test('unapproved and oversized requests make no network call', async () => {
  let calls = 0;
  const request = async () => { calls++; return response(mp3().buffer); };
  await assert.rejects(synthesizeOnlineChunk('text',normalizeSettings({speechEngine:'byok'}),app,request));
  await assert.rejects(synthesizeOnlineChunk('x'.repeat(201),normalizeSettings({speechEngine:'mimo',mimoConsent:true,mimoSecretName:'mimo-key'}),app,request));
  assert.equal(calls,0);
});

test('revocation and model changes discard an in-flight response, playback changes do not', async () => {
  for (const patch of [{openRouterConsent:false},{openRouterModel:'other/model'}]) {
    let settings = normalizeSettings({speechEngine:'openrouter',openRouterConsent:true,openRouterSecretName:'speech-key'});
    await assert.rejects(synthesizeOnlineChunk('text',settings,app,async()=>{
      settings = {...settings,...patch}; return response(mp3().buffer);
    },()=>settings), /configuration or consent changed/);
  }
  let settings = normalizeSettings({speechEngine:'openrouter',openRouterConsent:true,openRouterSecretName:'speech-key'});
  await synthesizeOnlineChunk('text',settings,app,async()=>{ settings={...settings,speed:2,volume:0.2}; return response(mp3().buffer); },()=>settings);
});

test('BYOK errors are sanitized, are not retried and never play non-audio data', async () => {
  const settings = normalizeSettings({speechEngine:'byok',byokProfile:grantByokConsent(normalizeByokProfile({secretName:'speech-key'}))});
  let calls=0;
  await assert.rejects(synthesizeOnlineChunk('text',settings,app,async()=>{calls++;throw new Error('private echo and credential');}), error => !error.message.includes('private echo'));
  assert.equal(calls,1);
  await assert.rejects(synthesizeOnlineChunk('text',settings,app,async()=>response(jsonBytes({error:'private echo'}))), /valid MP3/);
});

test('custom transport forbids redirects and cookies and aborts oversized bodies', async () => {
  let options;
  await guardedFetch({url:'https://example.com/speech',headers:{},body:'{}'},async(url,opts)=>{
    options=opts; return new Response(mp3(), {status:200,headers:{'content-type':'audio/mpeg'}});
  });
  assert.equal(options.redirect,'error'); assert.equal(options.credentials,'omit'); assert.equal(options.cache,'no-store');
  await assert.rejects(guardedFetch({url:'https://example.com/speech'},async()=>new Response(mp3(),{headers:{'content-length':String(21*1024*1024)}})),/too large/);
});
