const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings } = require('../src/config');
const { sanitizeAcademicTextForSpeech: clean } = require('../src/speech-text');
const { splitTextForSpeechChunks } = require('../src/sentence-chunker');
const { markdownBlocks, mapSpeechBlocks, markdownHighlightSource, pdfHighlightBlocks } = require('../src/highlight-source');
const { ReadingHighlights } = require('../src/reading-highlights');

test('highlighting is on by default and can be disabled without persisting source data', () => {
  assert.equal(normalizeSettings({}).readingHighlight, true);
  const settings = normalizeSettings({ readingHighlight: false, highlightSource: 'private' });
  assert.equal(settings.readingHighlight, false); assert.equal(settings.highlightSource, undefined);
});

test('ordered source mapping distinguishes repeated paragraphs without changing speech chunks', () => {
  const raw = '# Public sample\n\nSame passage.\n\nA different passage.\n\nSame passage.';
  const chunks = ['Public sample', 'Same passage.', 'A different passage.', 'Same passage.'];
  const source = markdownHighlightSource(raw, chunks, clean, { sourceText: raw, sourceOffset: 0 });
  assert.equal(source.ranges[1][0].from, raw.indexOf('Same passage.'));
  assert.equal(source.ranges[3][0].from, raw.lastIndexOf('Same passage.'));
  assert.deepEqual(chunks, ['Public sample', 'Same passage.', 'A different passage.', 'Same passage.']);
});

test('ambiguous selections are hidden but an explicit editor offset identifies the correct occurrence', () => {
  const text = 'Same passage.\n\nSame passage.';
  assert.equal(markdownHighlightSource('Same passage.', ['Same passage.'], clean, { sourceText: text }), null);
  const source = markdownHighlightSource('Same passage.', ['Same passage.'], clean, { sourceText: text, sourceOffset: 15 });
  assert.equal(source.ranges[0][0].from, 15);
});

test('rendered selections preserve source markup and omit comments or complex formulas safely', () => {
  const raw = '# Note\n\n<!-- hidden\n\nmetadata -->\n\nRead **this passage** now.\n\n$$\n\\sum_{i=1}^{n} x_i\n$$\n\nLast passage.';
  const chunks = splitTextForSpeechChunks(clean(raw), [60]);
  const source = markdownHighlightSource(raw, chunks, clean, { sourceText: raw });
  assert.ok(source.ranges.flat().some(r => raw.slice(r.from, r.to).includes('this passage')));
  assert.ok(source.ranges.flat().every(r => !raw.slice(r.from, r.to).includes('metadata')));
  const selected = markdownHighlightSource('Read this passage now.', ['Read this passage now.'], clean, { sourceText: raw });
  assert.match(raw.slice(selected.ranges[0][0].from, selected.ranges[0][0].to), /\*\*this passage\*\*/);
  assert.equal(markdownBlocks(raw).filter(b => b.text.includes('metadata')).length, 1);
});

test('context-sensitive mismatches only resume at unique ordered blocks', () => {
  const blocks = ['Same', 'Same', 'Final'].map((speech, id) => ({ speech, target: { id } }));
  assert.deepEqual(mapSpeechBlocks(blocks, ['Formula. Same Final']), [[{ id: 2 }]]);
  assert.deepEqual(mapSpeechBlocks([{ speech: 'different', target: {} }], ['Actual']), [[]]);
});

test('PDF targets retain page coordinates across columns and pages, without marking omission-only lines', () => {
  const rect = [10, 20, 90, 30];
  const pages = [{ pageNumber: 1, layout: { lines: [{ text: 'First line.', highlightRect: rect }, { text: 'Formula.', highlightRect: rect }] } },
    { pageNumber: 2, layout: { lines: [{ text: 'Next line.', highlightRect: [100, 500, 180, 510] }] } }];
  const blocks = pdfHighlightBlocks(pages, x => x);
  assert.equal(blocks.filter(block => block.target).length, 2);
  const ranges = mapSpeechBlocks(blocks, ['First line. Formula. Next line.']);
  assert.deepEqual(ranges[0].map(r => r.page), [1, 2]);
  assert.deepEqual(ranges[0][0].rect, rect);
});

function controllerFixture() {
  const text = '# Example\n\nFirst passage.\n\nSecond passage.';
  const classes = () => { const values = new Set(); return { values, add: v => values.add(v), remove: v => values.delete(v) }; };
  const sections = markdownBlocks(text).map(block => ({ start: { offset: block.from }, end: { offset: block.to },
    el: { isConnected: true, classList: classes(), querySelector: () => null } }));
  const file = { path: 'public-example.md', extension: 'md', stat: { mtime: 1 } };
  const view = { file, getMode: () => 'preview', editor: { getValue: () => text }, previewMode: { renderer: { sections } }, contentEl: {} };
  const plugin = { settings: { readingHighlight: true }, getSourceLeaf: () => ({ view }), prepareText: clean,
    queue: { items: [{}, {}, {}], currentIndex: 1, status: 'playing' } };
  const controller = new ReadingHighlights(plugin);
  controller.begin(text, ['Example', 'First passage.', 'Second passage.'], { file, sourceText: text, sourceOffset: 0 }, clean);
  return { plugin, controller, sections, view, file };
}

test('preview highlighting follows chunk changes, remains on pause, clears on stop and can be toggled', () => {
  const { controller: c, plugin: p, sections } = controllerFixture();
  const active = () => sections.map(s => s.el.classList.values.has('note-reader-mobile-speaking'));
  c.update(); assert.deepEqual(active(), [false, true, false]);
  p.queue.status = 'paused'; c.update(); assert.deepEqual(active(), [false, true, false]);
  p.queue.currentIndex = 2; c.update(); assert.deepEqual(active(), [false, false, true]);
  p.settings.readingHighlight = false; c.update(); assert.deepEqual(active(), [false, false, false]);
  p.settings.readingHighlight = true; c.update(); assert.deepEqual(active(), [false, false, true]);
  p.queue.status = 'complete'; c.update(); assert.deepEqual(active(), [false, false, false]);
  c.dispose(); assert.equal(c.session, null);
});

test('editing the note or switching files clears all old marks without affecting playback', () => {
  for (const change of [f => { f.view.editor.getValue = () => 'Changed'; }, f => { f.file.stat.mtime++; }, f => { f.view.file = { path: 'elsewhere.md' }; }]) {
    const f = controllerFixture(); f.controller.update(); change(f); f.controller.update();
    assert.ok(f.sections.every(s => s.el.classList.values.size === 0));
    assert.equal(f.plugin.queue.status, 'playing');
  }
});

test('PDF overlays use the nested viewer viewport, ignore pointer events via CSS, and are removed on stop', () => {
  const document = { createElement: () => ({ style: {}, children: [], setAttribute() {}, append(child) { child.parent = this; this.children.push(child); }, remove() { this.parent.children = this.parent.children.filter(c => c !== this); }, get ownerDocument() { return document; } }) };
  const div = document.createElement(); div.isConnected = true;
  const rect = [10, 20, 80, 30]; let converted;
  const page = { div, viewport: { convertToViewportRectangle: value => { converted = value; return [20, 60, 160, 40]; } } };
  const file = { path: 'public.pdf', extension: 'pdf', stat: { mtime: 1 } };
  const view = { file, viewer: { child: { pdfViewer: { pdfViewer: { getPageView: n => n === 0 ? page : null } } } }, contentEl: {} };
  const plugin = { settings: {}, getSourceLeaf: () => ({view}), queue: { items: [{}], currentIndex: 0, status: 'playing' } };
  const controller = new ReadingHighlights(plugin);
  controller.begin(null, ['Public line.'], { file, highlightRanges: [[{ kind: 'pdf', page: 1, rect }]] }, value => value);
  controller.update(); assert.deepEqual(converted, rect); assert.equal(div.children.length, 1);
  assert.deepEqual(div.children[0].children[0].style, { left: '20px', top: '40px', width: '140px', height: '20px' });
  controller.update(); assert.equal(div.children.length, 1);
  controller.dispose(); assert.equal(div.children.length, 0);
});
