const test = require('node:test');
const assert = require('node:assert/strict');
const {BYOK_PROVIDERS,normalizeByokProfile,grantByokConsent,hasByokConsent,updateByokProfile,buildByokRequest,validateByokEndpoint} = require('../src/byok');

const approved = provider => grantByokConsent(normalizeByokProfile({provider, ...BYOK_PROVIDERS[provider], voice:'voice-test',secretName:'tts-key'}));
test('consent covers provider, destination, model, voice and secret reference',()=>{
  const profile=approved('openai-compatible'); assert.equal(hasByokConsent(profile),true);
  for (const patch of [{model:'other'},{voice:'other'},{secretName:'other-key'},{endpoint:'https://example.com/tts'}]) {
    const changed=updateByokProfile(profile,patch); assert.equal(hasByokConsent(changed),false);
    if(patch.endpoint) assert.equal(changed.secretName,'');
  }
});
test('endpoint checks reject plaintext, credentials, query, fragments and nonpreset destinations',()=>{
  for(const endpoint of ['http://example.com','https://a:b@example.com','https://example.com?key=a','https://example.com#part']) {
    assert.throws(()=>validateByokEndpoint({...approved('openai-compatible'),endpoint}));
  }
  assert.throws(()=>validateByokEndpoint({...approved('elevenlabs'),endpoint:'https://example.com/speech'}));
});
test('provider adapters generate only documented speech request shapes',()=>{
  const open=buildByokRequest(approved('openai-compatible'),'text','key');
  assert.equal(JSON.parse(open.body).speed,1); assert.equal(JSON.parse(open.body).input,'text');
  const eleven=buildByokRequest(approved('elevenlabs'),'text','key');
  assert.equal(eleven.headers['xi-api-key'],'key'); assert.match(eleven.url,/voice-test\?output_format=mp3_44100_128$/);
  const minimax=JSON.parse(buildByokRequest(approved('minimax'),'text','key').body);
  assert.equal(minimax.output_format,'hex'); assert.equal(minimax.stream,false);
});
