const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDocument } = require('htmlparser2');
const { extractHtmlText, extractHtmlTree, captureHtmlSelection, htmlReaderDocument } = require('../src/html-text');
const { monoPcm, wavBytes, synthesizeWav, saveExport, EXPORT_FOLDER } = require('../src/audio-export');
const { validateWave } = require('../src/audio-data');

test('HTML source parsing decodes entities and preserves paragraphs without scripts, navigation or controls', () => {
  const text = extractHtmlText('<head><title>Metadata</title></head><nav>Menu</nav><article><h1>Title</h1><p>A &amp; B</p><p>C<br>D</p><script>throw Error()</script><iframe src="https://example.org"></iframe><button>Action</button><p hidden>Hidden</p><span style="display: none">Secret</span></article>');
  assert.match(text, /Title\n+A & B\n+C\nD/);
  assert.doesNotMatch(text, /Metadata|Menu|throw|Action|Hidden|Secret|example/);
});

test('HTML tables honor academic omission settings and explicit all mode', () => {
  const table = `<table><caption>Measurements</caption><tr><th>Unit</th><th>Value</th></tr>${Array.from({ length: 20 }, (_, i) => `<tr><td>${i}</td><td>${i + 10}</td></tr>`).join('')}</table>`;
  assert.doesNotMatch(extractHtmlText(table, { academicTableMode: 'skip', academicSkipNotice: false }), /10;|19;/);
  assert.match(extractHtmlText(table, { academicTableMode: 'all' }), /19; 29;/);
});

test('rendered HTML ranges start at the selected duplicate, not the first occurrence', () => {
  const root = parseDocument('<p>Duplicate sentence.</p><p>Duplicate sentence.</p><p>Final sentence.</p>');
  const node = root.children[1].children[0];
  const range = { startContainer: node, startOffset: 0, endContainer: node, endOffset: 9 };
  const result = extractHtmlTree(root, range);
  assert.equal(result.selected, 'Duplicate');
  assert.equal(result.fromSelection, 'Duplicate sentence.\n\nFinal sentence.');
  root.contains = () => true;
  const captured = captureHtmlSelection({ body: root, getSelection: () => ({ rangeCount: 1, isCollapsed: false, getRangeAt: () => range }) });
  assert.equal(captured.htmlFrom, result.fromSelection);
});

test('element-boundary ranges work and inaccessible iframe documents fail without reading another document', () => {
  const root = parseDocument('<p>First</p><p>Second</p><p>Third</p>');
  assert.equal(extractHtmlTree(root, { startContainer: root, startOffset: 1, endContainer: root, endOffset: 2 }).selected, 'Second');
  const frame = {}; Object.defineProperty(frame, 'contentDocument', { get() { throw new Error('cross-origin'); } });
  assert.equal(htmlReaderDocument({ mainView: { iframe: frame } }), null);
});

function decoded(values, sampleRate = 24000) {
  return { length: values.length, numberOfChannels: 1, sampleRate, getChannelData: () => Float32Array.from(values) };
}
test('WAV export has correct PCM lengths and no synthetic silence between parts', () => {
  const parts = [monoPcm(decoded([1, -.5]), 100), monoPcm(decoded([.25, -1]), 100)];
  const bytes = wavBytes(parts, 24000), view = new DataView(bytes);
  assert.equal(bytes.byteLength, 52);
  assert.equal(view.getUint32(40, true), 8);
  assert.equal(view.getInt16(44, true), 32767);
  assert.equal(view.getInt16(48, true), 8192);
  assert.equal(view.getInt16(50, true), -32768);
  assert.equal(validateWave(bytes).byteLength, 52);
});

test('export processes sequentially and closes the decoder on success and rejection', async () => {
  const sent = [], progress = []; let closed = 0, concurrent = 0;
  const result = await synthesizeWav(['one', 'two'], {
    synthesize: async (text) => { assert.equal(concurrent++, 0); sent.push(text); concurrent--; return { arrayBuffer: new ArrayBuffer(1) }; },
    decoder: { decodeAudioData: async () => decoded([.25]), close: async () => { closed++; } },
    progress: (n) => progress.push(n),
  });
  assert.equal(result.byteLength, 48); assert.deepEqual(sent, ['one', 'two']); assert.deepEqual(progress, [0, 1, 2]); assert.equal(closed, 1);
  await assert.rejects(synthesizeWav(['one'], { synthesize: async () => { throw new Error('Provider failure'); },
    decoder: { close: async () => { closed++; } } }), /Provider failure/);
  assert.equal(closed, 2);
});

test('cancellation stops after an in-flight request and prevents decoding or future paid requests', async () => {
  let cancelled = false, sent = 0, closed = 0;
  await assert.rejects(synthesizeWav(['one', 'two'], {
    cancelled: () => cancelled,
    synthesize: async () => { sent++; cancelled = true; return { arrayBuffer: new ArrayBuffer(1) }; },
    decoder: { decodeAudioData: async () => { throw new Error('Should not decode'); }, close: async () => { closed++; } },
  }), /cancelled/);
  assert.equal(sent, 1); assert.equal(closed, 1);
});

test('oversized text makes no request and audio limits stop further chunks', async () => {
  let sent = 0;
  const options = { synthesize: async () => { sent++; return { arrayBuffer: new ArrayBuffer(1) }; },
    decoder: { decodeAudioData: async () => decoded([.1, .2]), close: async () => {} } };
  await assert.rejects(synthesizeWav(['x'.repeat(30001)], options), /30,000/);
  assert.equal(sent, 0);
  await assert.rejects(synthesizeWav(['one', 'two'], { ...options, maxBytes: 46 }), /limit/);
  assert.equal(sent, 1);
});

test('saving stays inside the export folder and never overwrites an existing file', async () => {
  const files = new Map(), writes = [];
  const vault = { getAbstractFileByPath: (path) => files.get(path),
    createFolder: async (path) => { files.set(path, { children: [] }); },
    createBinary: async (path, bytes) => { assert.equal(files.has(path), false); files.set(path, { bytes }); writes.push(path); } };
  const bytes = wavBytes([monoPcm(decoded([.1]), 100)], 24000);
  const path = await saveExport(vault, '../../example.wav', bytes);
  const second = await saveExport(vault, '../../example.wav', bytes);
  assert.ok(path.startsWith(`${EXPORT_FOLDER}/reading-`)); assert.equal(path.split('/').length, 2);
  assert.notEqual(path, second); assert.equal(writes.length, 2);
  await assert.rejects(saveExport(vault, 'cancelled', bytes, () => true), /cancelled/);
  assert.equal(writes.length, 2);
});
