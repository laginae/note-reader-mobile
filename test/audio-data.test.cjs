const test = require('node:test');
const assert = require('node:assert/strict');
const {mp3,wave,jsonBytes,base64}=require('./audio-fixtures.cjs');
const {validateMp3,validateWave,decodeMimoAudio,decodeMinimaxAudio}=require('../src/audio-data');
test('audio validators accept complete frames and reject truncation and JSON',()=>{
  assert.equal(validateMp3(mp3()).length,417); assert.equal(validateWave(wave()).length,48);
  assert.throws(()=>validateMp3(mp3().slice(0,400)),/Truncated/);
  assert.throws(()=>validateWave(wave().slice(0,46)),/truncated/);
  assert.throws(()=>validateMp3(new Uint8Array(jsonBytes({error:'hidden'}))));
});
test('MiMo audio must have a normal completion and intact WAV samples',()=>{
  const complete=data=>jsonBytes({choices:[{finish_reason:'stop',message:{audio:{data}}}]});
  assert.equal(decodeMimoAudio(complete(base64(wave()))).mimeType,'audio/wav');
  assert.throws(()=>decodeMimoAudio(complete(base64(wave().slice(0,46)))));
  assert.throws(()=>decodeMimoAudio(complete('not-base64')));
});

test('PCM extensible WAV remains compatible while unknown subtypes are rejected',()=>{
  const base=wave(), bytes=new Uint8Array(base.length+24), view=new DataView(bytes.buffer);
  bytes.set(base.subarray(0,36)); bytes.set(base.subarray(36),60);
  view.setUint32(4,bytes.length-8,true); view.setUint32(16,40,true);
  view.setUint16(20,0xfffe,true); view.setUint16(36,22,true); view.setUint16(38,16,true);
  view.setUint32(44,1,true); bytes.set([0,0,16,0,128,0,0,170,0,56,155,113],48);
  assert.equal(validateWave(bytes).length,72);
  bytes[44]=9; assert.throws(()=>validateWave(bytes));
});
test('MiniMax rejects incomplete and quota errors without leaking response text',()=>{
  const hex=Array.from(mp3(),x=>x.toString(16).padStart(2,'0')).join('');
  assert.equal(decodeMinimaxAudio(jsonBytes({base_resp:{status_code:0},data:{status:2,audio:hex}})).mimeType,'audio/mpeg');
  assert.throws(()=>decodeMinimaxAudio(jsonBytes({base_resp:{status_code:1008,status_msg:'private'},data:{}})),/Insufficient balance/);
  assert.throws(()=>decodeMinimaxAudio(jsonBytes({base_resp:{status_code:0},data:{status:1,audio:hex}})),/incomplete/);
});
