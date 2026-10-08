'use strict';
// Reproducible synthetic latency, not a paid TTS or device-audio benchmark.
const assert = require('node:assert/strict');
const { PreparationPool, PlaybackTimings } = require('../src/preparation-pool');

class Clock {
  constructor() { this.time = 0; this.events = []; }
  wait(delay) { return new Promise(resolve => this.events.push({at:this.time + delay, resolve})); }
  async run(work) {
    let done = false, result, failure;
    work().then(value => {result=value;done=true;}, error => {failure=error;done=true;});
    while (!done) {
      // Flush nested promise continuations before advancing virtual time.
      await new Promise(resolve => setImmediate(resolve));
      if (done) break;
      assert.ok(this.events.length, 'Simulation stalled');
      this.events.sort((a,b) => a.at-b.at);
      this.time = this.events[0].at;
      const due = this.events.filter(event => event.at === this.time);
      this.events = this.events.filter(event => event.at !== this.time);
      due.forEach(event => event.resolve());
    }
    if(failure) throw failure;
    return result;
  }
}

async function scenario(strategy, synthesisMs, playbackMs) {
  const clock = new Clock(), metrics = new PlaybackTimings(() => clock.time);
  const pool = new PreparationPool({timings:metrics});
  const count = 8, gaps=[], first=[], replay=[];
  let requests=0, active=0, peak=0;
  const request = (index, background=false) => pool.get(String(index), async () => {
    requests++; peak=Math.max(peak,++active);
    await clock.wait(synthesisMs); active--;
    return {arrayBuffer:new ArrayBuffer(8)};
  }, {background});
  return clock.run(async () => {
    for(let i=0;i<count;i++) {
      const started=clock.time;
      const ready=request(i);
      if(strategy==='boundedLookahead' && i+1<count) request(i+1,true);
      await ready;
      if(strategy==='desktopPreviousLookahead' && i+1<count) request(i+1,true);
      (i===0 ? first : gaps).push(clock.time-started);
      await clock.wait(playbackMs);
    }
    const before=requests;
    for(let i=0;i<count;i++) {
      const started=clock.time; await request(i); replay.push(clock.time-started);
    }
    return {strategy, synthesisMs, playbackMs, parts:count, firstWaitMs:first[0],
      gapsMs:gaps, totalGapMs:gaps.reduce((a,b)=>a+b,0), replayWaitMs:replay,
      requests, replayRequests:requests-before, peakConcurrency:peak};
  });
}

(async () => {
  const results=[];
  for(const [synthesis,playback] of [[300,900],[900,300]]) {
    for(const strategy of ['mobilePreviousSequential','desktopPreviousLookahead','boundedLookahead']) {
      results.push(await scenario(strategy,synthesis,playback));
    }
  }
  assert.ok(results.every(row => row.peakConcurrency<=2 && row.replayRequests===0));
  for(let offset=0;offset<results.length;offset+=3) {
    assert.ok(results[offset+2].totalGapMs < results[offset].totalGapMs);
    assert.ok(results[offset+2].totalGapMs <= results[offset+1].totalGapMs);
  }
  console.log(JSON.stringify({kind:'synthetic-virtual-clock', notes:[
    'No network, no real voices, no device decoding or source extraction.',
    'Previous strategies describe request timing only; all rows use the new pool for the replay subtest.',
    'First cold synthesis is not eliminated. Actual service/device P50 and P95 require opt-in real measurements.'
  ], results},null,2));
})().catch(error => {console.error(error);process.exitCode=1;});
