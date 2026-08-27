const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

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
} = require('../src/speech-services');
Module._load = originalLoad;

test('quota errors are explicit', () => {
  assert.match(createHttpError(402, 'OpenRouter TTS').message, /insufficient balance or quota/);
  assert.match(createHttpError(429, 'OpenRouter TTS').message, /rate or quota limit/);
});

test('audio requests reject oversized responses', async () => {
  await assert.rejects(
    () => postForAudio(
      { url: 'https://example.com' },
      'Test TTS',
      async () => ({ status: 200, arrayBuffer: { byteLength: 21 * 1024 * 1024 }, headers: {} })
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
      arrayBuffer: new Uint8Array([1, 2, 3]).buffer,
      headers: { 'content-type': 'audio/mpeg' },
    };
  });

  const body = JSON.parse(captured.body);
  assert.equal(body.provider.zdr, true);
  assert.equal(body.provider.data_collection, 'deny');
  assert.equal(captured.headers.Authorization, 'Bearer secret-value');
  assert.equal(result.mimeType, 'audio/mpeg');
});
