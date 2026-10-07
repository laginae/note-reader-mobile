const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const { normalizeSettings } = require('../src/config');
const { createPlaybackQueueState } = require('@laginae/note-reader-core');
const { grantByokConsent, normalizeByokProfile } = require('../src/byok');

class Element {
  constructor(tag = 'div', options = {}) { this.tagName = tag.toUpperCase(); this.textContent = options.text || ''; this.className = options.cls || ''; this.children = []; this.events = {}; this.attrs = {}; }
  createEl(tag, options) { const el = new Element(tag, options); this.children.push(el); return el; }
  createDiv(options) { return this.createEl('div', options); }
  createSpan(options) { return this.createEl('span', options); }
  get firstElementChild() { return this.children[0]; }
  empty() { this.children = []; }
  addClass(name) { this.className += ` ${name}`; }
  toggleClass() {}
  setAttr(name, value) { this.attrs[name] = value; }
  addEventListener(name, callback) { this.events[name] = callback; }
  all() { return [this, ...this.children.flatMap((el) => el.all())]; }
}
class Control {
  constructor() { this.options = {}; }
  setValue(value) { this.value = value; return this; }
  onChange(callback) { this.change = callback; return this; }
  onClick(callback) { this.click = callback; return this; }
  addOption(key, value) { this.options[key] = value; return this; }
  setLimits() { return this; }
  setDynamicTooltip() { return this; }
  setPlaceholder() { return this; }
  setButtonText() { return this; }
}
class Setting {
  constructor(container) { container.rows ||= []; container.rows.push(this); }
  setName(value) { this.name = value; return this; }
  setDesc(value) { this.desc = value; return this; }
  control(callback) { this.input = new Control(); callback(this.input); return this; }
  addText(callback) { return this.control(callback); }
  addSlider(callback) { return this.control(callback); }
  addDropdown(callback) { return this.control(callback); }
  addToggle(callback) { return this.control(callback); }
  addButton(callback) { return this.control(callback); }
  addComponent(callback) { this.input = callback({}); return this; }
}
let synthesize = async () => ({ arrayBuffer: new ArrayBuffer(8), mimeType: 'audio/mpeg' });
const originalLoad = Module._load;
let loaded;
let actualServices;
try {
  Module._load = function(request, parent, isMain) {
    if (request === 'obsidian') return { Plugin: class {}, ItemView: class {}, MarkdownView: class {}, Notice: class {},
      PluginSettingTab: class { constructor(app) { this.app = app; this.containerEl = new Element(); } },
      Setting, SecretComponent: Control, setIcon: (element, icon) => { element.icon = icon; } };
    if (request === './speech-services') return { synthesizeOnlineChunk: (...args) => synthesize(...args) };
    return originalLoad.call(this, request, parent, isMain);
  };
  loaded = require('../src/main');
  actualServices = require('../src/speech-services');
} finally { Module._load = originalLoad; }

function fixture(overrides = {}) {
  const plugin = new loaded.default();
  plugin.settings = normalizeSettings(overrides);
  plugin.queue = createPlaybackQueueState([{ id: 'one', text: 'First paragraph.' }, { id: 'two', text: 'Second paragraph.' }]);
  plugin.sessionId = 1; plugin.runId = 1; plugin.pauseRequested = false; plugin.resumeWaiters = [];
  plugin.sourceLabel = ''; plugin.statusDetail = ''; plugin.phaseOverride = '';
  plugin.app = { secretStorage: {}, workspace: { getLeavesOfType: () => [] } };
  plugin.saved = [];
  plugin.saveData = async (value) => plugin.saved.push(value);
  plugin.lastSpeechConfiguration = plugin.speechConfigurationKey();
  return plugin;
}

test('speed and volume update active audio immediately and persist without cancelling', async () => {
  const plugin = fixture({ speechEngine: 'mimo' });
  plugin.activeAudio = { playbackRate: 1, volume: 1 };
  await plugin.setPlaybackSpeed(1.5);
  plugin.applyVolume(0.3);
  await plugin.saveSettings();
  assert.equal(plugin.activeAudio.playbackRate, 1.5);
  assert.equal(plugin.activeAudio.volume, 0.3);
  assert.equal(plugin.saved.at(-1).volume, 0.3);
  assert.equal(plugin.sessionId, 1);
});

test('current audio seeking clamps boundaries, remains paused, and disables system seeking', () => {
  const plugin = fixture({ speechEngine: 'mimo' });
  plugin.activeAudio = { currentTime: 3, duration: 8 };
  plugin.pauseRequested = true;
  assert.equal(plugin.seekAudioBy(-5), true);
  assert.equal(plugin.activeAudio.currentTime, 0);
  plugin.seekAudioBy(30);
  assert.equal(plugin.activeAudio.currentTime, 8);
  assert.equal(plugin.pauseRequested, true);
  plugin.settings.speechEngine = 'system';
  assert.equal(plugin.seekAudioBy(-5), false);
});

test('stable player updates preserve controls and in-progress scrub position', () => {
  const plugin = fixture({ speechEngine: 'mimo' });
  plugin.activeAudio = { currentTime: 2, duration: 30 };
  const container = new Element();
  plugin.renderView(container);
  const refs = plugin.playerViews.get(container);
  refs.seek.value = '19'; refs.seek.events.input();
  plugin.activeAudio.currentTime = 4;
  plugin.renderView(container);
  assert.equal(plugin.playerViews.get(container), refs);
  assert.equal(refs.seek.value, '19');
  refs.seek.events.change();
  assert.equal(plugin.activeAudio.currentTime, 19);
  assert.equal(refs.volume.attrs['aria-label'], 'Volume');
});

test('configuration or consent changes invalidate playback before saving', async () => {
  const plugin = fixture({ speechEngine: 'mimo', mimoConsent: true });
  plugin.settings.mimoConsent = false;
  plugin.saveData = async () => { assert.equal(plugin.sessionId, 2); assert.equal(plugin.queue.items.length, 0); };
  await plugin.saveSettings();
});

test('late synthesized audio is discarded after consent revocation', async () => {
  const plugin = fixture({ speechEngine: 'mimo', mimoConsent: true });
  let resolve;
  synthesize = (...args) => { assert.equal(args[4](), plugin.settings); return new Promise((done) => { resolve = done; }); };
  const pending = plugin.playOnlineChunk('Hello', 1, 1);
  await new Promise((done) => setImmediate(done));
  plugin.settings.mimoConsent = false;
  await plugin.saveSettings();
  resolve({ arrayBuffer: new ArrayBuffer(8), mimeType: 'audio/mpeg' });
  assert.equal(await pending, 'cancelled');
  assert.equal(plugin.activeAudio, undefined);
});

test('each online audio applies persistent playback settings and detaches event handlers', async () => {
  const plugin = fixture({ speechEngine: 'mimo', speed: 1.5, volume: 0.4 });
  synthesize = async () => ({ arrayBuffer: new ArrayBuffer(8), mimeType: 'audio/mpeg' });
  const OriginalAudio = global.Audio;
  const instances = [];
  global.Audio = class {
    constructor() { instances.push(this); }
    play() { return Promise.resolve(); }
    pause() {}
    removeAttribute() {}
    load() {}
  };
  try {
    for (let index = 0; index < 2; index += 1) {
      const pending = plugin.playOnlineChunk('A public test sentence.', 1, 1);
      await new Promise((resolve) => setImmediate(resolve));
      const audio = instances.at(-1);
      assert.equal(audio.playbackRate, 1.5);
      assert.equal(audio.volume, 0.4);
      assert.equal(typeof audio.ontimeupdate, 'function');
      audio.onended();
      assert.equal(await pending, 'ended');
      assert.equal(audio.ontimeupdate, null);
      assert.equal(plugin.activeAudio, null);
    }
  } finally { global.Audio = OriginalAudio; }
});

test('a superseded run does not advance a new queue after position save finishes', async () => {
  const plugin = fixture();
  plugin.playSystemChunk = async () => 'ended';
  let finishSave;
  plugin.rememberPosition = () => new Promise((resolve) => { finishSave = resolve; });
  const pending = plugin.runFromCurrent();
  await new Promise((resolve) => setImmediate(resolve));
  plugin.sessionId += 1;
  plugin.queue = createPlaybackQueueState([{ id: 'new', text: 'New reading session.' }]);
  const newQueue = plugin.queue;
  finishSave();
  await pending;
  assert.equal(plugin.queue, newQueue);
});

test('MiMo and other online engines use conservative chunk caps', () => {
  assert.deepEqual(fixture({ speechEngine: 'mimo', chunkLimits: '200,400,800' }).getChunkLimits(), [200, 200, 200]);
  assert.deepEqual(fixture({ speechEngine: 'byok', chunkLimits: '200,1000,5000' }).getChunkLimits(), [200, 800, 800]);
});

test('all six engines have compact categorized bilingual settings', () => {
  for (const settingsLanguage of ['english', 'chinese']) for (const speechEngine of ['system', 'azure', 'openrouter', 'remote-cosyvoice', 'mimo', 'byok']) {
    const plugin = fixture({ settingsLanguage, speechEngine });
    const tab = new loaded.__test.NoteReaderMobileSettingTab(plugin.app, plugin);
    tab.display();
    assert.equal(tab.containerEl.all().filter((el) => el.attrs.role === 'tab').length, 4);
    assert.ok(tab.containerEl.rows.some((row) => row.name === loaded.__test.UI[settingsLanguage].engine));
    tab.activeTab = 'privacy'; tab.containerEl.rows = []; tab.display();
    assert.ok(tab.containerEl.rows.some((row) => row.name === loaded.__test.UI[settingsLanguage].privacy));
    assert.ok(!tab.containerEl.rows.some((row) => row.name === loaded.__test.UI[settingsLanguage].engine));
  }
});

test('academic reading uses core opt-in settings only when Markdown stripping is enabled', () => {
  const plugin = fixture();
  assert.match(plugin.prepareText('研究[2][4]。 $x_i$'), /文献2和4/);
  assert.match(plugin.prepareText('$x_i$'), /sub/);
  plugin.settings.stripMarkdown = false;
  assert.equal(plugin.prepareText('研究[2][4]。 $x_i$'), '研究[2][4]。 $x_i$');
  const tab = new loaded.__test.NoteReaderMobileSettingTab(plugin.app, plugin);
  tab.activeTab = 'academic'; tab.display();
  assert.equal(tab.containerEl.rows.find((row) => row.name === 'Formula reading').input.value, 'smart');
  assert.equal(tab.containerEl.rows.find((row) => row.name === 'Table reading').input.value, 'smart');
  assert.equal(tab.containerEl.rows.find((row) => row.name === 'Announce omitted content').input.value, true);
});

const multipartText = 'This first sentence has enough characters to begin. '
  + 'This second sentence also has enough characters for the second opening stage. '
  + 'The remaining sentence still belongs to the same logical chunk.';

test('opening audio parts stay in one queue item and only advance after all finish', async () => {
  const plugin = fixture({ speechEngine: 'mimo' });
  plugin.queue = createPlaybackQueueState([{ id: 'one', text: multipartText }]);
  const pendingParts = [];
  const texts = [];
  plugin.playOnlineChunk = (text) => { texts.push(text); return new Promise((resolve) => pendingParts.push(resolve)); };
  const running = plugin.runFromCurrent();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(texts.length, 1);
  assert.equal(plugin.queue.currentIndex, 0);
  pendingParts.shift()('ended');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(texts.length, 2);
  assert.equal(plugin.queue.currentIndex, 0);
  assert.notEqual(plugin.queue.status, 'complete');
  pendingParts.shift()('ended');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(texts.length, 3);
  assert.notEqual(plugin.queue.status, 'complete');
  pendingParts.shift()('ended');
  await running;
  assert.equal(plugin.queue.status, 'complete');
  assert.equal(texts.join(' '), multipartText);
});

test('pause between opening parts sends nothing until resumed', async () => {
  const plugin = fixture({ speechEngine: 'mimo' });
  let count = 0;
  plugin.playOnlineChunk = async () => {
    count += 1;
    if (count === 1) plugin.pauseReading();
    return 'ended';
  };
  const pending = plugin.playOnlineParts(multipartText, 1, 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(count, 1);
  plugin.resumeReading();
  assert.equal(await pending, 'ended');
  assert.equal(count, 3);
});

test('cancelling while paused between opening parts never requests the remainder', async () => {
  const plugin = fixture({ speechEngine: 'mimo' });
  let count = 0;
  plugin.playOnlineChunk = async () => { count += 1; plugin.pauseReading(); return 'ended'; };
  const pending = plugin.playOnlineParts(multipartText, 1, 1);
  await new Promise((resolve) => setImmediate(resolve));
  plugin.stopReading({ quiet: true });
  assert.equal(await pending, 'cancelled');
  assert.equal(count, 1);
});

test('BYOK configuration changes clear consent and visible secret selection', async () => {
  const profile = grantByokConsent(normalizeByokProfile({ secretName: 'speech-key' }));
  const plugin = fixture({ speechEngine: 'byok', byokProfile: profile });
  const tab = new loaded.__test.NoteReaderMobileSettingTab(plugin.app, plugin);
  tab.display();
  const rows = tab.containerEl.rows;
  await rows.find((row) => row.name === 'Speech endpoint').input.change('https://speech.example.com/v1/audio/speech');
  assert.equal(plugin.settings.byokProfile.consent, '');
  assert.equal(rows.find((row) => row.name === 'API secret').input.value, '');
  assert.equal(rows.find((row) => row.name === 'Allow online processing').input.value, false);
});

test('remote destination edits revoke consent, clear only the secret reference, and preserve focused controls', async () => {
  const plugin = fixture({ speechEngine: 'remote-cosyvoice', remoteEndpoint: 'https://original.example/tts', remoteConsent: true, remoteSecretName: 'speech-key' });
  let secretsRead = 0;
  plugin.app.secretStorage.getSecret = () => { secretsRead += 1; return 'synthetic-test-secret'; };
  const tab = new loaded.__test.NoteReaderMobileSettingTab(plugin.app, plugin);
  tab.display();
  const rows = tab.containerEl.rows;
  const endpoint = rows.find((row) => row.name === 'Remote CosyVoice endpoint').input;
  await endpoint.change('https://replacement.example/tts');
  assert.equal(plugin.settings.remoteConsent, false);
  assert.equal(plugin.settings.remoteSecretName, '');
  assert.equal(rows.find((row) => row.name === 'Allow online processing').input.value, false);
  assert.equal(rows.find((row) => row.name === 'API secret').input.value, '');
  assert.equal(tab.containerEl.rows, rows);
  assert.equal(plugin.sessionId, 2);
  let requests = 0;
  await assert.rejects(actualServices.synthesizeOnlineChunk('Public test sentence.', plugin.settings, plugin.app, async () => { requests += 1; }), /Enable remote CosyVoice/);
  assert.equal(requests, 0);
  assert.equal(secretsRead, 0);
  // Selecting a secret and renewing approval explicitly restores the legitimate route.
  plugin.settings.remoteConsent = true;
  plugin.settings.remoteSecretName = 'speech-key';
  const { mp3 } = require('./audio-fixtures.cjs');
  const result = await actualServices.synthesizeOnlineChunk('Public test sentence.', plugin.settings, plugin.app, async (request) => {
    requests += 1;
    assert.equal(request.url, 'https://replacement.example/tts');
    return { status: 200, headers: { 'content-type': 'audio/mpeg' }, arrayBuffer: mp3().buffer };
  });
  assert.equal(result.mimeType, 'audio/mpeg');
  assert.equal(requests, 1);
  assert.equal(secretsRead, 1);
});

test('remote endpoint whitespace-only edits preserve approval, path edits revoke it', async () => {
  const plugin = fixture({ speechEngine: 'remote-cosyvoice', remoteEndpoint: 'https://original.example/tts', remoteConsent: true, remoteSecretName: 'speech-key' });
  await plugin.updateRemoteEndpoint(' https://original.example/tts ');
  assert.equal(plugin.settings.remoteConsent, true);
  assert.equal(plugin.settings.remoteSecretName, 'speech-key');
  await plugin.updateRemoteEndpoint('https://original.example/another-tts');
  assert.equal(plugin.settings.remoteConsent, false);
  assert.equal(plugin.settings.remoteSecretName, '');
});

test('blocked autoplay retries the same audio on Resume without another synthesis', async () => {
  const plugin = fixture({ speechEngine: 'mimo' });
  let requests = 0;
  synthesize = async () => { requests += 1; return { arrayBuffer: new ArrayBuffer(8), mimeType: 'audio/mpeg' }; };
  const OriginalAudio = global.Audio;
  let attempts = 0;
  global.Audio = class {
    play() { attempts += 1; return attempts < 3 ? Promise.reject(Object.assign(new Error('gesture'), { name: 'NotAllowedError' })) : Promise.resolve(); }
    pause() {}
    removeAttribute() {}
    load() {}
  };
  try {
    const pending = plugin.playOnlineChunk('Public test.', 1, 1);
    await new Promise((done) => setImmediate(done));
    const audio = plugin.activeAudio;
    assert.ok(audio);
    assert.equal(plugin.pauseRequested, true);
    assert.equal(plugin.playbackBlocked, true);
    plugin.resumeReading();
    await new Promise((done) => setImmediate(done));
    assert.equal(plugin.pauseRequested, true);
    plugin.resumeReading();
    await new Promise((done) => setImmediate(done));
    assert.equal(plugin.activeAudio, audio);
    assert.equal(plugin.pauseRequested, false);
    assert.equal(requests, 1);
    audio.onended();
    assert.equal(await pending, 'ended');
  } finally { global.Audio = OriginalAudio; }
});

test('Stop while autoplay is blocked settles pending playback and revokes its blob', async () => {
  const plugin = fixture({ speechEngine: 'mimo' });
  synthesize = async () => ({ arrayBuffer: new ArrayBuffer(8), mimeType: 'audio/mpeg' });
  const OriginalAudio = global.Audio;
  const originalRevoke = URL.revokeObjectURL;
  const revoked = [];
  URL.revokeObjectURL = (url) => { revoked.push(url); originalRevoke(url); };
  global.Audio = class {
    play() { throw Object.assign(new Error('gesture'), { name: 'NotAllowedError' }); }
    pause() {}
    removeAttribute() { this.removed = true; }
    load() {}
  };
  try {
    const pending = plugin.playOnlineChunk('Public test.', 1, 1);
    await new Promise((done) => setImmediate(done));
    const audio = plugin.activeAudio;
    const url = plugin.activeAudioUrl;
    assert.equal(plugin.pauseRequested, true);
    plugin.stopReading({ quiet: true });
    assert.equal(await pending, 'cancelled');
    assert.deepEqual(revoked, [url]);
    assert.equal(plugin.activeAudio, null);
    assert.equal(audio.removed, true);
  } finally { global.Audio = OriginalAudio; URL.revokeObjectURL = originalRevoke; }
});

test('hidden document after extraction waits before sending any opening part', async () => {
  const originalDocument = global.document;
  global.document = { hidden: true };
  try {
    const plugin = fixture({ speechEngine: 'mimo' });
    let calls = 0;
    plugin.playOnlineChunk = async () => { calls += 1; return 'ended'; };
    const pending = plugin.playOnlineParts(multipartText, 1, 1);
    await new Promise((done) => setImmediate(done));
    assert.equal(calls, 0);
    assert.equal(plugin.pauseRequested, true);
    plugin.resumeReading();
    assert.equal(plugin.pauseRequested, true);
    global.document.hidden = false;
    plugin.resumeReading();
    assert.equal(await pending, 'ended');
    assert.equal(calls, 3);
  } finally { global.document = originalDocument; }
});

test('system speech does not start while hidden and cancellation releases the wait', async () => {
  const originalDocument = global.document;
  global.document = { hidden: true };
  try {
    const plugin = fixture();
    const pending = plugin.playSystemChunk('Public test.');
    await new Promise((done) => setImmediate(done));
    assert.equal(plugin.pauseRequested, true);
    plugin.stopReading({ quiet: true });
    assert.equal(await pending, 'cancelled');
  } finally { global.document = originalDocument; }
});
