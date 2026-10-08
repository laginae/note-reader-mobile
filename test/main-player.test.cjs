const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const { normalizeSettings } = require('../src/config');
const { createPlaybackQueueState } = require('@laginae/note-reader-core');
const { grantByokConsent, normalizeByokProfile } = require('../src/byok');

class Element {
  constructor(tag = 'div', options = {}) { this.tagName = tag.toUpperCase(); this.textContent = options.text || ''; this.className = options.cls || ''; this.children = []; this.events = {}; this.attrs = {}; }
  createEl(tag, options) { const el = new Element(tag, options); el.parentElement = this; this.children.push(el); return el; }
  insertBefore(el, before) {
    if (el === before) return el;
    if (el.parentElement) el.parentElement.children = el.parentElement.children.filter((child) => child !== el);
    const index = this.children.indexOf(before);
    this.children.splice(index < 0 ? this.children.length : index, 0, el);
    el.parentElement = this;
    return el;
  }
  get isConnected() { return !this.removed; }
  remove() { this.removed = true; if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((el) => el !== this); }
  contains(node) { return this.all().includes(node); }
  createDiv(options) { return this.createEl('div', options); }
  createSpan(options) { return this.createEl('span', options); }
  get firstElementChild() { return this.children[0]; }
  empty() { this.children = []; }
  addClass(name) { this.className += ` ${name}`; }
  removeClass(name) { this.className = this.className.split(' ').filter((item) => item !== name).join(' '); }
  toggleClass() {}
  setAttr(name, value) { this.attrs[name] = value; }
  setAttribute(name, value) { this.attrs[name] = value; }
  addEventListener(name, callback) { this.events[name] = callback; }
  all() { return [this, ...this.children.flatMap((el) => el.all())]; }
}
class Control {
  constructor() { this.options = {}; this.inputEl = new Element('textarea'); }
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
  constructor(container) { container.rows ||= []; container.rows.push(this); this.settingEl = container.createDiv(); }
  setName(value) { this.name = value; return this; }
  setDesc(value) { this.desc = value; return this; }
  control(callback) { this.input = new Control(); callback(this.input); return this; }
  addText(callback) { return this.control(callback); }
  addTextArea(callback) { return this.control(callback); }
  addSlider(callback) { return this.control(callback); }
  addDropdown(callback) { return this.control(callback); }
  addToggle(callback) { return this.control(callback); }
  addButton(callback) { return this.control(callback); }
  addComponent(callback) { this.input = callback({}); return this; }
}
let synthesize = async () => ({ arrayBuffer: new ArrayBuffer(8), mimeType: 'audio/mpeg' });
let pdfLoader = async () => ({});
const originalLoad = Module._load;
let loaded;
let actualServices;
try {
  Module._load = function(request, parent, isMain) {
    if (request === 'obsidian') return { Plugin: class {}, ItemView: class {}, MarkdownView: class {}, Notice: class {},
      Modal: class { constructor(app) { this.app = app; this.contentEl = new Element(); this.modalEl = new Element(); } open() { this.onOpen(); } close() { this.onClose(); } },
      loadPdfJs: (...args) => pdfLoader(...args),
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
  plugin.app = { secretStorage: {}, vault: {}, workspace: { getLeavesOfType: () => [] } };
  plugin.saved = [];
  plugin.saveData = async (value) => plugin.saved.push(value);
  plugin.lastSpeechConfiguration = plugin.speechConfigurationKey();
  return plugin;
}

function sourceFixture(plugin, extension = 'md') {
  const containerEl = new Element();
  containerEl.createDiv({ cls: 'view-header' });
  const contentEl = containerEl.createDiv();
  const file = { path: `public-example.${extension}`, extension, stat: { mtime: 1 } };
  const leaf = { view: { file, containerEl, contentEl, getViewType: () => extension === 'pdf' ? 'pdf' : 'markdown' } };
  plugin.app.workspace.activeLeaf = leaf;
  plugin.app.workspace.revealLeaf = async (value) => { plugin.app.workspace.activeLeaf = value; };
  return leaf;
}

test('speech terms are applied once per request without changing queue text or exceeding limits', async () => {
  const plugin = fixture({ speechEngine:'mimo', speechTermsEnabled:true, speechTerms:'BESS = battery energy storage system' });
  const source = ('BESS control. ').repeat(30);
  plugin.queue = createPlaybackQueueState([{id:'one', text:source}]);
  const sent = [];
  plugin.playOnlineChunk = async text => { sent.push(text); return 'ended'; };
  await plugin.playOnlineParts(source, plugin.sessionId, plugin.runId);
  assert.ok(sent.every(text => text.length <= 200));
  assert.equal(sent.join(''), source.replaceAll('BESS', 'battery energy storage system'));
  assert.equal(plugin.queue.items[0].text, source);
  plugin.openAudioExport();
  assert.deepEqual(plugin.exportModal.texts, sent);
  plugin.exportModal.close();
  assert.deepEqual(plugin.exportModal, null);
});

test('ElevenLabs advanced options hide for unsupported models without discarding preferences', async () => {
  const plugin = fixture({ speechEngine:'openrouter', openRouterModel:'elevenlabs/eleven-v4', openRouterContext:true });
  const tab = new loaded.__test.NoteReaderMobileSettingTab(plugin.app, plugin);
  tab.display();
  assert.ok(tab.containerEl.all().some(el => el.textContent === 'ElevenLabs advanced options'));
  plugin.settings.openRouterModel = 'hexgrad/kokoro-82m'; tab.display();
  assert.ok(!tab.containerEl.all().some(el => el.textContent === 'ElevenLabs advanced options'));
  assert.equal(plugin.settings.openRouterContext, true);
  tab.activeTab = 'academic'; tab.display();
  const row = tab.containerEl.rows.find(row => row.name === 'Term rules');
  await row.input.change('BESS = B E S S');
  assert.equal(plugin.settings.speechTerms, 'BESS = B E S S');
  await row.input.change('invalid');
  assert.equal(plugin.settings.speechTerms, 'BESS = B E S S');
  assert.equal(row.input.inputEl.attrs['aria-invalid'], 'true');
});

test('cache and position clearing are separate and preserve playback and credentials', async () => {
  const plugin = fixture(); const queue = plugin.queue;
  plugin.settings.readingPositions = { example: { anchor: 'test' } };
  let closed = false; plugin.outlineModal = { close: () => { closed = true; } };
  plugin.pdfOutlineCache = { text: 'cached text' };
  plugin.clearOutlineCache();
  assert.equal(closed, true); assert.equal(plugin.pdfOutlineCache, null);
  assert.ok(plugin.settings.readingPositions.example); assert.equal(plugin.queue, queue);
  await plugin.clearSavedReadingPositions();
  assert.deepEqual(plugin.settings.readingPositions, {}); assert.equal(plugin.queue, queue);
  assert.equal(plugin.saved.length, 1);
});

test('Markdown outline loads, locates without starting playback, and reads only the selected section', async () => {
  const plugin = fixture(); const leaf = sourceFixture(plugin);
  plugin.app.vault.cachedRead = async () => '# One\nfirst\n# Two\nsecond';
  let position; leaf.view.editor = { scrollIntoView: (range) => { position = range; } };
  const cached = await plugin.loadPdfOutline(leaf.view.file, () => false, () => {});
  const queue = plugin.queue;
  await plugin.locateOutlineEntry(leaf.view.file, cached.key, cached.data, 1);
  assert.equal(position.from.line, 2); assert.equal(plugin.queue, queue);
  let text; plugin.startTextSession = (value) => { text = value; };
  plugin.readPdfSection(leaf.view.file, cached.key, cached.data, 0, false);
  assert.equal(text, '# One\nfirst\n');
});

test('PDF navigation uses page coordinates when available and a page link otherwise', async () => {
  const plugin = fixture(); const leaf = sourceFixture(plugin, 'pdf');
  const { outlineKey } = require('../src/pdf-outline');
  const key = outlineKey(leaf.view.file, plugin.settings.pdfSkipHeaders);
  const data = { entries: [{ page: 2, offset: 0 }], pages: [{ pageNumber: 2, layout: { lines: [{ offset: 0, y: 500, xMin: 40 }] } }] };
  let destination; leaf.view.viewer = { child: { pdfViewer: { scrollPageIntoView: (v) => { destination = v; } } } };
  await plugin.locateOutlineEntry(leaf.view.file, key, data, 0);
  assert.equal(destination.pageNumber, 2); assert.equal(destination.destArray[3], 500);
  leaf.view.viewer = null; let link; plugin.app.workspace.openLinkText = async (v) => { link = v; };
  await plugin.locateOutlineEntry(leaf.view.file, key, data, 0);
  assert.equal(link, 'public-example.pdf#page=2');
});

test('HTML navigation locates the selected duplicate heading without starting speech', async () => {
  const plugin = fixture(); const leaf = sourceFixture(plugin, 'html');
  plugin.app.vault.cachedRead = async () => '<h1>Same</h1><p>first</p><h1>Same</h1><p>second</p>';
  let located = -1;
  leaf.view.mainView = { iframe: { contentDocument: { body: { localName: 'body', childNodes: [0, 1].map((n) => ({ nodeType: 1, localName: 'h1', getAttribute: () => null, textContent: 'Same', childNodes: [{ nodeType: 3, nodeValue: 'Same' }], scrollIntoView: () => { located = n; } })) } } } };
  const result = await plugin.loadPdfOutline(leaf.view.file, () => false, () => {});
  await plugin.locateOutlineEntry(leaf.view.file, result.key, result.data, 1);
  assert.equal(located, 1);
});

test('toolbar stays inside the source view, survives refresh, and closes without leaving audio running', async () => {
  const plugin = fixture({ speechEngine: 'mimo' });
  const source = sourceFixture(plugin);
  plugin.activeAudio = { currentTime: 2, duration: 30, pause() {}, removeAttribute() {}, load() {} };
  plugin.showToolbar();
  const dock = plugin.dock;
  assert.equal(dock.root.parentElement, source.view.containerEl);
  assert.equal(source.view.containerEl.children[0].className, 'view-header');
  assert.equal(source.view.containerEl.children[1], dock.root);
  assert.equal(source.view.containerEl.children[2], source.view.contentEl);
  assert.equal(plugin.app.workspace.activeLeaf, source);
  dock.seek.value = '12'; dock.seek.events.input();
  plugin.renderViews();
  assert.equal(plugin.dock, dock);
  assert.equal(dock.seek.value, '12');
  dock.seek.events.change();
  assert.equal(plugin.activeAudio.currentTime, 12);
  await plugin.closeReader();
  assert.equal(dock.root.removed, true);
  assert.equal(plugin.dock, null);
  assert.equal(plugin.activeAudio, null);
  assert.equal(plugin.queue.items.length, 0);
  plugin.renderViews();
  assert.equal(plugin.dock, null);
});

test('toolbar Stop cancels audio and resets controls without closing the source or toolbar', () => {
  const plugin = fixture({ speechEngine: 'mimo', settingsLanguage: 'chinese' });
  const source = sourceFixture(plugin);
  let paused = false;
  plugin.activeAudio = { currentTime: 2, duration: 30, pause() { paused = true; }, removeAttribute() {}, load() {} };
  plugin.showToolbar();
  const dock = plugin.dock;
  const sessionId = plugin.sessionId;
  assert.equal(dock.stop.attrs['aria-label'], '停止');
  assert.equal(dock.stop.disabled, false);
  dock.stop.events.click();
  assert.equal(paused, true);
  assert.ok(plugin.sessionId > sessionId);
  assert.equal(plugin.queue.items.length, 0);
  assert.equal(plugin.activeAudio, null);
  assert.equal(plugin.dock, dock);
  assert.equal(dock.root.isConnected, true);
  assert.equal(plugin.toolbarEnabled, true);
  assert.equal(plugin.app.workspace.activeLeaf, source);
  assert.equal(dock.stop.disabled, true);
  assert.equal(dock.scope.disabled, false);
  assert.equal(dock.play.disabled, false);
  assert.equal(dock.play.attrs['aria-label'], '朗读当前文件');
});

test('toolbar Stop is available during PDF extraction and invalidates the pending operation', () => {
  const plugin = fixture();
  sourceFixture(plugin, 'pdf');
  const operationId = plugin.beginOperation('extracting');
  const dock = plugin.dock;
  assert.equal(dock.stop.disabled, false);
  assert.equal(dock.play.disabled, true);
  dock.stop.events.click();
  assert.notEqual(plugin.sessionId, operationId);
  assert.equal(plugin.phaseOverride, '');
  assert.equal(plugin.dock, dock);
  assert.equal(dock.play.disabled, false);
});

test('panel has return and close controls; returning preserves playback and focuses source', async () => {
  const plugin = fixture({ settingsLanguage: 'chinese' });
  const source = sourceFixture(plugin);
  plugin.sourceLeaf = source;
  let detached = false;
  const panel = { view: { getViewType: () => loaded.__test.VIEW_TYPE }, detach() { detached = true; } };
  plugin.app.workspace.activeLeaf = panel;
  plugin.app.workspace.getLeavesOfType = () => detached ? [] : [panel];
  const root = new Element(); plugin.renderView(root);
  assert.ok(root.all().some((el) => el.attrs['aria-label'] === '返回正文'));
  assert.ok(root.all().some((el) => el.attrs['aria-label'] === '停止并关闭朗读器'));
  const queue = plugin.queue;
  await plugin.closeReader(false);
  assert.equal(detached, true);
  assert.equal(plugin.app.workspace.activeLeaf, source);
  assert.equal(plugin.queue, queue);
  assert.ok(plugin.dock);
});

test('Markdown selection survives panel focus and collapsed editor selection with exact cursor position', async () => {
  const plugin = fixture();
  const source = sourceFixture(plugin);
  let selected = 'Second sentence';
  let range;
  source.view.editor = { getSelection: () => selected, getCursor: () => ({ line: 2, ch: 4 }), lineCount: () => 5,
    getLine: () => 'last line', getRange: (from, to) => { range = { from, to }; return 'Second sentence and remainder.'; } };
  plugin.captureSelection();
  plugin.app.workspace.activeLeaf = { view: { getViewType: () => loaded.__test.VIEW_TYPE } };
  selected = '';
  let started;
  plugin.startTextSession = (text, context) => { started = { text, context }; };
  await plugin.readFromSelection();
  assert.equal(started.text, 'Second sentence and remainder.');
  assert.equal(started.context.file, source.view.file);
  assert.deepEqual(range.from, { line: 2, ch: 4 });
  assert.deepEqual(range.to, { line: 4, ch: 9 });
});

test('cached selection cannot leak into another file or survive a modified source', () => {
  const plugin = fixture();
  const source = sourceFixture(plugin);
  source.view.editor = { getSelection: () => 'Selected', getCursor: () => ({ line: 0, ch: 0 }) };
  plugin.captureSelection();
  source.view.editor.getSelection = () => '';
  source.view.file.stat.mtime = 2;
  assert.equal(plugin.getSelectionSnapshot(), null);
  source.view.file.stat.mtime = 1;
  sourceFixture(plugin);
  assert.equal(plugin.getSelectionSnapshot(), null);
  plugin.app.workspace.activeLeaf = { view: { getViewType: () => 'search' } };
  assert.equal(plugin.getSelectionSnapshot(), null);
});

test('PDF selected text and page survive opening the panel; unrelated selections are ignored', async () => {
  const plugin = fixture();
  const source = sourceFixture(plugin, 'pdf');
  const span = source.view.contentEl.createSpan();
  span.nodeType = 1;
  span.closest = () => ({ getAttribute: (key) => key === 'data-page-number' ? '6' : '' });
  let selection = { anchorNode: span, focusNode: span, toString: () => 'Public PDF sentence.' };
  const originalWindow = global.window;
  global.window = { getSelection: () => selection };
  try {
    plugin.captureSelection();
    selection = { anchorNode: new Element(), focusNode: new Element(), toString: () => 'Wrong panel text' };
    plugin.captureSelection();
    plugin.app.workspace.activeLeaf = { view: { getViewType: () => loaded.__test.VIEW_TYPE } };
    let read;
    plugin.readPdf = async (file, context) => { read = { file, context }; };
    await plugin.readFromSelection();
    assert.equal(read.context.anchor, 'Public PDF sentence.');
    assert.equal(read.context.startPageNumber, 6);
    assert.equal(read.file, source.view.file);
  } finally { global.window = originalWindow; }
});

test('preview mode uses visible selection instead of a stale editor selection', () => {
  const plugin = fixture();
  const source = sourceFixture(plugin);
  source.view.getMode = () => 'preview';
  source.view.editor = { getSelection: () => 'Stale hidden editor text' };
  const span = source.view.contentEl.createSpan(); span.nodeType = 1;
  const originalWindow = global.window;
  global.window = { getSelection: () => ({ anchorNode: span, focusNode: span, toString: () => 'Visible selected text' }) };
  try { assert.equal(plugin.getSelectedText(), 'Visible selected text'); }
  finally { global.window = originalWindow; }
});

test('toolbar follows file tabs without duplicating and system speech disables seeking', () => {
  const plugin = fixture();
  sourceFixture(plugin);
  plugin.showToolbar();
  const old = plugin.dock;
  assert.equal(old.seek.disabled, true);
  const next = sourceFixture(plugin, 'pdf');
  plugin.syncToolbar();
  assert.equal(old.root.removed, true);
  assert.equal(plugin.dock.host, next.view.containerEl);
  assert.equal(next.view.containerEl.children.filter((el) => el.className === 'note-reader-mobile-dock').length, 1);
});

test('toolbar sits above PDF wrappers, remains above content after refresh and removes only its own layout class', async () => {
  const plugin = fixture();
  const leaf = sourceFixture(plugin, 'pdf');
  const wrapper = leaf.view.contentEl;
  leaf.view.contentEl = wrapper.createDiv({ cls: 'pdf-container' });
  leaf.view.containerEl.addClass('existing-theme-class');
  plugin.showToolbar();
  const root = plugin.dock.root;
  assert.deepEqual(leaf.view.containerEl.children.slice(1), [root, wrapper]);
  plugin.renderViews();
  assert.equal(plugin.dock.root, root);
  assert.deepEqual(leaf.view.containerEl.children.slice(1), [root, wrapper]);
  await plugin.closeReader();
  assert.equal(leaf.view.containerEl.children[1], wrapper);
  assert.ok(leaf.view.containerEl.className.includes('existing-theme-class'));
  assert.ok(!leaf.view.containerEl.className.includes('note-reader-mobile-docked-view'));
});

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
  synthesize = (...args) => { assert.deepEqual(args[4](), plugin.settings); return new Promise((done) => { resolve = done; }); };
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

test('PDF header filter has bilingual academic settings and changes only the next session', async () => {
  for (const [settingsLanguage, name] of [['english', 'Skip PDF headers and footers'], ['chinese', '跳过 PDF 页眉页脚']]) {
    const plugin = fixture({ settingsLanguage });
    const tab = new loaded.__test.NoteReaderMobileSettingTab(plugin.app, plugin);
    tab.activeTab = 'academic'; tab.display();
    const row = tab.containerEl.rows.find((r) => r.name === name);
    assert.equal(row.input.value, true);
    const queue = plugin.queue, sessionId = plugin.sessionId;
    await row.input.change(false);
    assert.equal(plugin.saved.at(-1).pdfSkipHeaders, false);
    assert.equal(plugin.queue, queue);
    assert.equal(plugin.sessionId, sessionId);
  }
});

test('PDF selection-only reading bypasses header filtering', async () => {
  const plugin = fixture({ pdfSkipHeaders: true });
  sourceFixture(plugin, 'pdf');
  plugin.getSelectedText = () => 'A. Researcher et al.';
  plugin.getSelectionSnapshot = () => ({ pageNumber: 2 });
  let result;
  plugin.startTextSession = (text, context) => { result = { text, context }; };
  plugin.readPdf = async () => { throw new Error('Selection must not re-extract the PDF'); };
  await plugin.readSelection();
  assert.equal(result.text, 'A. Researcher et al.');
  assert.equal(result.context.pageNumber, 2);
});

test('PDF anchors use filtered body or the original first page when an explicit edge anchor was removed', () => {
  const plugin = fixture({ stripMarkdown: false });
  const header = 'A. Researcher et al. Journal article.';
  const body = 'Earlier body sentence. Resume at this body sentence.';
  const pages = [{ pageNumber: 2, text: body, unfilteredText: `${header}\n${body}` },
    { pageNumber: 3, text: 'Later filtered body sentence.', unfilteredText: `${header}\nLater filtered body sentence.` }];
  const content = (anchor) => plugin.buildPdfChunks(pages, { anchor }).map((chunk) => chunk.text).join('\n');
  const bodyStart = content('Resume at this body sentence.');
  assert.match(bodyStart, /^Resume at this body sentence/);
  assert.doesNotMatch(bodyStart, /Researcher|Earlier/);
  const edgeStart = content(header);
  assert.ok(edgeStart.startsWith(header));
  assert.equal(edgeStart.split(header).length - 1, 1);
  assert.match(edgeStart, /Later filtered body/);
});

test('PDF footnote modes affect playback chunks but not plain selection reading', async () => {
  const plugin = fixture({ stripMarkdown: false });
  const pages = [{ pageNumber: 1, text: 'Body text.\n1 Footnote text.', layout: { lines: [{ text: '1 Footnote text.', footnote: true }] } }];
  const join = (context = {}) => plugin.buildPdfChunks(pages, context).map((chunk) => chunk.text).join(' ');
  assert.equal(join(), 'Body text.');
  assert.equal(join({ footnoteMode: 'footnotes' }), '1 Footnote text.');
  assert.match(join({ footnoteMode: 'inline' }), /Body text/); assert.match(join({ footnoteMode: 'inline' }), /Footnote text/);
  const session = plugin.sessionId;
  const tab = new loaded.__test.NoteReaderMobileSettingTab(plugin.app, plugin); tab.activeTab = 'academic'; tab.display();
  await tab.containerEl.rows.find((r) => r.name === 'PDF footnote reading').input.change('inline');
  assert.equal(plugin.saved.at(-1).pdfFootnoteMode, 'inline'); assert.equal(plugin.sessionId, session);
});

test('PDF outline is cached in memory, invalidates on source/filter changes, and supports explicit refresh', async () => {
  const plugin = fixture(), source = sourceFixture(plugin, 'pdf');
  let reads = 0, destroyed = 0;
  plugin.app.vault.readBinary = async () => { reads++; return new ArrayBuffer(4); };
  pdfLoader = async () => ({ getDocument: () => ({ promise: Promise.resolve({ numPages: 1,
    getPage: async () => ({ getTextContent: async () => ({ items: [
      { str: '1. Introduction', width: 220, height: 12, transform: [12, 0, 0, 12, 40, 700] },
      { str: 'Public body text sufficiently long to determine the ordinary font size.', width: 400, height: 10, transform: [10, 0, 0, 10, 40, 600] },
    ] }), getViewport: () => ({ width: 600, height: 800 }), cleanup() {} }),
    getOutline: async () => [], destroy: async () => { destroyed++; },
  }) }) });
  const first = await plugin.loadPdfOutline(source.view.file, () => false, () => {});
  assert.equal(first.data.entries.length, 1);
  assert.equal(await plugin.loadPdfOutline(source.view.file, () => false, () => {}), first);
  assert.equal(reads, 1);
  await plugin.loadPdfOutline(source.view.file, () => false, () => {}, true); assert.equal(reads, 2);
  source.view.file.stat.mtime++;
  await plugin.loadPdfOutline(source.view.file, () => false, () => {}); assert.equal(reads, 3);
  plugin.settings.pdfSkipHeaders = false;
  await plugin.loadPdfOutline(source.view.file, () => false, () => {}); assert.equal(reads, 4);
  assert.equal(destroyed, 4); assert.equal(plugin.saved.length, 0);
});

test('outline modal is searchable, closes during loading, and ignores late results without interrupting playback', async () => {
  const plugin = fixture({ settingsLanguage: 'chinese' }); sourceFixture(plugin, 'pdf');
  let finish, isCancelled;
  plugin.loadPdfOutline = (_file, cancelled) => { isCancelled = cancelled; return new Promise((resolve) => { finish = resolve; }); };
  const queue = plugin.queue;
  plugin.openPdfOutline(); const modal = plugin.outlineModal;
  assert.ok(modal.contentEl.all().some((el) => el.attrs['aria-label'] === '关闭大纲'));
  assert.equal(modal.readSection.disabled, true);
  plugin.openPdfOutline(); assert.equal(plugin.outlineModal, modal);
  modal.close(); assert.equal(isCancelled(), true);
  finish({ key: 'test', data: { entries: [{ title: '1. Example', level: 1, page: 1 }], source: 'bookmarks' } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(plugin.outlineModal, null); assert.equal(plugin.queue, queue); assert.equal(modal.data, null);
});

test('outline UI binds selected section indices after filtering and does not rescan on search', async () => {
  const plugin = fixture(); sourceFixture(plugin, 'pdf'); let loads = 0, read;
  plugin.loadPdfOutline = async () => { loads++; return { key: 'test', data: { source: 'inferred', entries: [
    { title: '1. Introduction', level: 1, page: 1 }, { title: '2. Methods', level: 1, page: 2 },
  ] } }; };
  plugin.readPdfSection = (...args) => { read = args; };
  plugin.openPdfOutline(); const modal = plugin.outlineModal;
  await new Promise((resolve) => setImmediate(resolve));
  modal.search.value = 'Methods'; modal.search.events.input();
  assert.equal(modal.rows.length, 1); modal.rows[0].select.events.click();
  assert.equal(modal.readSection.disabled, false); modal.readRemaining.events.click();
  assert.equal(read[3], 1); assert.equal(read[4], true); assert.equal(loads, 1); assert.equal(modal.closed, true);
});

test('HTML source reading, saved anchors and cancellation never pass markup to speech', async () => {
  const plugin = fixture({ stripMarkdown: false }); const source = sourceFixture(plugin, 'html');
  plugin.app.vault.cachedRead = async () => '<p>Earlier sentence.</p><p>Resume at this sentence.</p><script>never read</script>';
  let result;
  plugin.startTextSession = (text, context) => { result = { text, context }; };
  await plugin.readFile(); assert.match(result.text, /Earlier/); assert.doesNotMatch(result.text, /<|never/);
  plugin.settings.readingPositions[source.view.file.path] = { anchor: 'Resume at this sentence.', kind: 'markdown' };
  await plugin.resumeFile(); assert.equal(result.text, 'Resume at this sentence.');
  let finish; result = null; plugin.app.vault.cachedRead = () => new Promise((resolve) => { finish = resolve; });
  const pending = plugin.readFile(); plugin.stopReading({ quiet: true }); finish('<p>Cancelled.</p>'); await pending;
  assert.equal(result, null);
});

test('HTML rendered selection uses its exact remaining text and the toolbar supports local HTML', async () => {
  const plugin = fixture(); const source = sourceFixture(plugin, 'html');
  plugin.getSelectionSnapshot = () => ({ text: 'Duplicate', htmlFrom: 'Duplicate at the second location. Final sentence.' });
  plugin.getSelectedText = () => 'Duplicate';
  let text; plugin.startTextSession = (value) => { text = value; };
  await plugin.readFromSelection(); assert.match(text, /^Duplicate at the second location/);
  plugin.showToolbar(); assert.equal(plugin.dock.host, source.view.containerEl); assert.equal(plugin.dock.outline.hidden, false);
});

test('audio export requires an online engine and explicit confirmation, with a single modal', () => {
  const plugin = fixture();
  plugin.openAudioExport(); assert.equal(plugin.exportModal, undefined);
  plugin.settings.speechEngine = 'mimo'; plugin.openAudioExport();
  const modal = plugin.exportModal;
  assert.equal(modal.busy, false); assert.equal(modal.startButton.disabled, false);
  assert.ok(modal.contentEl.all().some((el) => el.textContent.includes('synthesized again')));
  plugin.openAudioExport(); assert.equal(plugin.exportModal, modal);
  modal.close(); assert.equal(plugin.exportModal, null); assert.deepEqual(modal.texts, []);
});

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
