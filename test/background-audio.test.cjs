const test = require('node:test');
const assert = require('node:assert/strict');
const { mayPlayHidden, BackgroundAudioControls } = require('../src/background-audio');
test('background mode is explicitly opted in and never opts system speech in', () => {
  assert.equal(mayPlayHidden({speechEngine:'openrouter'}), false);
  assert.equal(mayPlayHidden({speechEngine:'system',backgroundAudio:true}), false);
  assert.equal(mayPlayHidden({speechEngine:'openrouter',backgroundAudio:true}), true);
});
test('media controls use generic metadata, current audio and normal player actions', () => {
  const handlers = {}, actions = [], media = {setActionHandler:(key,value)=>{handlers[key]=value;}, setPositionState:value=>{media.position=value;}};
  class Metadata { constructor(value) { Object.assign(this,value); } }
  const plugin = {settings:{backgroundAudio:true,speechEngine:'openrouter'},queue:{items:[{}],status:'playing'},
    sourceLabel:'private title',activeAudio:{duration:20,currentTime:5,playbackRate:1.75},
    resumeReading:()=>actions.push('resume'),pauseReading:()=>actions.push('pause'),stopReading:()=>actions.push('stop'),
    moveChunk:n=>actions.push(n),seekAudioBy:n=>actions.push(n),seekAudioTo:n=>actions.push(n)};
  const bridge = new BackgroundAudioControls(plugin,media,Metadata); bridge.update();
  assert.equal(media.metadata.title,'Cozy Read Aloud'); assert.ok(!JSON.stringify(media.metadata).includes('private'));
  assert.equal(media.position.playbackRate,1.75);
  handlers.pause();handlers.play();handlers.nexttrack();handlers.seekto({seekTime:12});
  assert.deepEqual(actions,['pause','resume',1,12]);
  plugin.pauseRequested=true;bridge.update();assert.equal(media.playbackState,'paused');
  plugin.queue.status='complete';bridge.update();assert.equal(media.playbackState,'none');assert.equal(handlers.play,null);
});
test('unsupported actions do not break playback; disposal preserves another player metadata', () => {
  const media={setActionHandler(){throw Error('unsupported');}};
  const plugin={settings:{backgroundAudio:true,speechEngine:'mimo'},queue:{items:[{}],status:'playing'}};
  class Metadata {constructor(value){Object.assign(this,value);}}
  const bridge=new BackgroundAudioControls(plugin,media,Metadata);bridge.update();
  media.metadata={title:'another player'};bridge.dispose();assert.equal(media.metadata.title,'another player');
});
