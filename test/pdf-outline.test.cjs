const test = require('node:test');
const assert = require('node:assert/strict');
const { extractPdfTextLayout } = require('@laginae/note-reader-core');
const { outlineLayout, resolvePdfBookmarks, buildPdfOutline, sectionPages, outlineKey } = require('../src/pdf-outline');
const { markFootnotes, splitFootnotesInRange, normalizeFootnoteMode } = require('../src/pdf-footnotes');
const { extractPdfDocument } = require('../src/pdf-extractor');

const viewport = { width: 600, height: 800, rotation: 0, viewBox: [0, 0, 600, 800] };
const item = (str, x, y, size = 10, width = 220, fontName = 'Regular') => ({ str, width, height: size, fontName, transform: [size, 0, 0, size, x, y] });
function page(number, items, vp = viewport) {
  let layout = outlineLayout(extractPdfTextLayout(items, { viewport: vp }), items, {}, vp);
  layout = markFootnotes(layout, items, vp, number);
  return { pageNumber: number, text: layout.text, layout };
}
const paragraph = 'Ordinary body sentence describing the public example and its methods in detail.';
const sample = () => [page(1, [item('1. Introduction', 40, 700, 12, 220, 'Bold'), item(paragraph, 40, 680),
  item('1.1 Background', 40, 600, 11, 220, 'Bold'), item(paragraph, 40, 580),
  item('2. Methods', 320, 700, 12, 220, 'Bold'), item(paragraph, 320, 680)]),
  page(2, [item('3. Results', 40, 700, 12, 220, 'Bold'), item(paragraph, 40, 680)])];

test('inference preserves numbers and nested levels in two-column reading order', () => {
  const result = buildPdfOutline(sample());
  assert.equal(result.source, 'inferred');
  assert.deepEqual(result.entries.map((e) => [e.title, e.level, e.page]), [
    ['1. Introduction', 1, 1], ['1.1 Background', 2, 1], ['2. Methods', 1, 1], ['3. Results', 1, 2],
  ]);
  assert.ok(result.entries.every((entry) => result.pages[entry.page - 1].text.slice(entry.offset).startsWith(entry.title)));
});

test('section-only includes children, excludes the next same-level section, and supports reading to the end', () => {
  const result = buildPdfOutline(sample());
  const text = (index, remaining) => sectionPages(result, index, remaining).map((p) => p.text).join('\n');
  assert.match(text(0), /1\.1 Background/);
  assert.doesNotMatch(text(0), /Methods|Results/);
  assert.match(text(1), /^1\.1 Background/);
  assert.doesNotMatch(text(1), /Introduction|Methods/);
  assert.match(text(2, true), /3\. Results/);
  assert.doesNotMatch(text(2, true), /Introduction/);
});

test('valid bookmarks take priority and borrow visible section numbering', () => {
  const result = buildPdfOutline(sample(), [{ title: 'Methods', page: 1, level: 1, x: 320, y: 700 }]);
  assert.equal(result.source, 'bookmarks');
  assert.deepEqual(result.entries.map((e) => e.title), ['2. Methods']);
  assert.ok(result.pages[0].text.slice(result.entries[0].offset).startsWith('2. Methods'));
  assert.equal(result.entries[0].approximate, false);
});

test('bookmark coordinates disambiguate same-height columns and unknown destinations visibly fall back to page start', () => {
  const result = buildPdfOutline(sample(), [
    { title: 'Section not matching text', page: 1, level: 1, x: 320, y: 700 },
    { title: 'Page-based bookmark', page: 2, level: 1, x: null, y: null },
  ]);
  assert.ok(result.pages[0].text.slice(result.entries[0].offset).startsWith('2. Methods'));
  assert.equal(result.entries[1].offset, 0);
  assert.equal(result.entries[1].approximate, true);
});

test('named and reference bookmark destinations resolve locally; broken and external destinations are ignored', async () => {
  const pdf = {
    numPages: 3,
    getOutline: async () => [{ title: 'External', url: 'https://example.org' },
      { title: 'Parent', dest: 'named', items: [{ title: 'Child', dest: [{ num: 1 }, { name: 'FitH' }, 500] }] },
      { title: 'Broken', dest: 'broken' }, { title: 'Invalid', dest: [-1, { name: 'Fit' }] }],
    getDestination: async (name) => { if (name === 'broken') throw new Error('broken'); return [0, { name: 'XYZ' }, 40, 700]; },
    getPageIndex: async () => 1,
  };
  assert.deepEqual((await resolvePdfBookmarks(pdf)).map((e) => [e.title, e.page, e.level]), [['Parent', 1, 1], ['Child', 2, 2]]);
  assert.deepEqual(await resolvePdfBookmarks({ getOutline: async () => { throw new Error('bad tree'); } }), []);
  await assert.rejects(resolvePdfBookmarks(pdf, () => true), /Cancelled/);
});

test('outline traversal is bounded even when bookmark nodes have no destinations', async () => {
  await assert.rejects(resolvePdfBookmarks({ getOutline: async () => Array.from({ length: 2001 }, () => ({})) }), /limit/);
});

test('inference excludes captions, tiny numbered footnotes and repeated edge text', () => {
  const pages = [1, 2].map((n) => page(n, [item('Repeated journal header', 40, 760, 10),
    item('4. Findings', 40, 600, 12, 220, 'Bold'), item(paragraph, 40, 580), item(paragraph, 40, 250),
    item('Table 3 Data', 40, 200, 10, 220, 'Bold'), item('2 Small footnote', 40, 120, 9), item('Continued note.', 40, 108, 9)]));
  const result = buildPdfOutline(pages);
  assert.ok(result.entries.every((entry) => entry.title === '4. Findings'));
});

test('outline keys change with source identity, modification, size and header filter', () => {
  const file = { path: 'public.pdf', stat: { mtime: 1, size: 100 } };
  const key = outlineKey(file, true);
  assert.notEqual(key, outlineKey(file, false));
  assert.notEqual(key, outlineKey({ ...file, path: 'other.pdf' }, true));
  assert.notEqual(key, outlineKey({ ...file, stat: { mtime: 2, size: 100 } }, true));
});

const footnoteItems = () => [item(paragraph, 40, 650), item(paragraph, 320, 650),
  item('Left body ending.', 40, 200), item('Right body ending.', 320, 200),
  item('2 Left note.', 40, 135, 9), item('Continued note.', 40, 122, 9),
  item('3 Right note.', 320, 135, 9), item('4 Other note.', 320, 122, 9), item('2', 290, 20, 8, 10)];

test('footnotes in both columns separate without dropping either body column', () => {
  const p = page(2, footnoteItems());
  const notes = p.layout.lines.filter((line) => line.footnote);
  const parts = splitFootnotesInRange(p.text, notes);
  assert.match(parts.body, /Left body ending/); assert.match(parts.body, /Right body ending/);
  assert.doesNotMatch(parts.body, /Left note|Other note/);
  assert.match(parts.notes, /2 Left note\.\nContinued note\.\n3 Right note\.\n4 Other note\./);
  assert.equal(notes.length, 4);
});

test('first-page correspondence and publication block is separated conservatively', () => {
  const items = [item(paragraph, 40, 650), item(paragraph, 320, 650), item('Left ending.', 40, 200), item('Right ending.', 320, 190),
    item('* Corresponding author at: Public University.', 40, 150, 9, 510), item('Public correspondence address.', 40, 138, 9),
    item('E-mail address: author@example.org.', 50, 126, 9), item('1 An ordinary note.', 40, 114, 9, 510),
    item('https://doi.org/10.0000/example', 40, 90, 9), item('Received 1 January; Accepted 2 February.', 40, 78, 9, 510),
    item('Available online 3 March.', 40, 66, 9), item('Copyright: open-access license.', 40, 54, 9, 510)];
  const p = page(1, items), parts = splitFootnotesInRange(p.text, p.layout.lines.filter((line) => line.footnote));
  assert.doesNotMatch(parts.body, /Corresponding|Received|Copyright/);
  assert.match(parts.body, /Left ending/); assert.match(parts.body, /Right ending/);
  assert.match(parts.notes, /Corresponding/); assert.match(parts.notes, /Copyright/);
});

test('same-size numbered body text, captions and uncertain duplicate text are preserved', () => {
  const sameSize = footnoteItems().map((i) => ({ ...i, height: 10, transform: [10, 0, 0, 10, i.transform[4], i.transform[5]] }));
  assert.equal(page(2, sameSize).layout.lines.filter((line) => line.footnote).length, 0);
  const captions = footnoteItems().map((i) => ({ ...i, str: i.str.replace(/^\d+ /, 'Figure ') }));
  assert.equal(page(2, captions).layout.lines.filter((line) => line.footnote).length, 0);
  const duplicate = '2 Left note.\n2 Left note.';
  assert.equal(splitFootnotesInRange(duplicate, [{ text: '2 Left note.' }]).body, duplicate);
  assert.equal(normalizeFootnoteMode('unknown'), 'body');
});

test('section ranges do not collect notes outside the selected section', () => {
  const p = page(2, footnoteItems());
  const notes = p.layout.lines.filter((line) => line.footnote);
  const parts = splitFootnotesInRange('Right body ending.\n3 Right note.\n4 Other note.', notes);
  assert.equal(parts.body, 'Right body ending.');
  assert.equal(parts.notes, '3 Right note.\n4 Other note.');
});

test('outline extraction attaches font/footnote metadata and releases PDF resources', async () => {
  let cleaned = 0, destroyed = 0;
  const pdf = { numPages: 1, getOutline: async () => [{ title: 'Introduction', dest: [0, { name: 'XYZ' }, 40, 700] }],
    getPage: async () => ({ getTextContent: async () => ({ items: [item('1. Introduction', 40, 700, 12), item(paragraph, 40, 680)] }),
      getViewport: () => viewport, cleanup: () => { cleaned += 1; } }), destroy: async () => { destroyed += 1; } };
  const result = await extractPdfDocument({ vault: { readBinary: async () => new ArrayBuffer(4) } }, { extension: 'pdf' },
    { includeOutline: true, loadPdfJs: async () => ({ getDocument: () => ({ promise: Promise.resolve(pdf) }) }) });
  assert.equal(result.bookmarks.length, 1);
  assert.ok(result.pages[0].layout.lines[0].fontSize > 0);
  assert.equal(cleaned, 1); assert.equal(destroyed, 1);
});
