const test = require('node:test');
const assert = require('node:assert/strict');
const { extractPdfTextLayout } = require('@laginae/note-reader-core');
const { extractPdfPages } = require('../src/pdf-extractor');
const { pdfMathChanges } = require('../src/pdf-speech/pdf-math');
const { preparePdfSpeech, preparePdfSelection } = require('../src/pdf-speech');
const { mathSpeech } = require('../src/pdf-speech/academic-speech');
const { fixture, item, viewport } = require('./pdf-fixtures.cjs');

function page(items = fixture(), settings = {}) {
  const layout = extractPdfTextLayout(items, { viewport });
  return { pageNumber: 1, text: layout.text, layout, mathChanges: pdfMathChanges(layout, items, settings) };
}

test('full page repairs math without changing original coordinates or outline text', () => {
  const data = page(), original = JSON.stringify(data.layout);
  const text = preparePdfSpeech(data.text, data);
  assert.match(text, /For q equals 2 the result holds/);
  assert.match(text, /alpha less than beta/);
  assert.doesNotMatch(text, /[\u0b00-\u0dff\u1200-\u137f]|\(9\)/);
  assert.equal((text.match(/Formula\./g) || []).length, 1);
  assert.equal(JSON.stringify(data.layout), original);
});

test('partial selections keep only selected prose and repair complete math runs', () => {
  const data = page();
  const chosen = 'q \u0d4c 2 the result';
  const text = preparePdfSelection(chosen, [data]);
  assert.match(text, /^q equals 2 the result$/);
  assert.doesNotMatch(text, /For|holds|Ordinary|Compare/);
  assert.equal(preparePdfSelection('not found', [data]), null);
  assert.equal(preparePdfSelection('same', [{ text: 'same same', mathChanges: [] }]), null);
  assert.equal(preparePdfSelection('second', [{ text: 'first second third', mathChanges: [] }]), 'second');
  assert.equal(preparePdfSelection('A selected expla-\nnation.', [{ text: 'Before. A selected explanation. After.', mathChanges: [] }]), 'A selected explanation.');
});

test('formula-only selection never reads neighbouring prose or unselected operands', () => {
  const data = page();
  const text = preparePdfSelection('q \u0d4c', [data]);
  assert.match(text, /Formula/);
  assert.doesNotMatch(text, /2|\bFor\b|holds|\u0d4c/);
  assert.equal(preparePdfSelection('q \u0d4c', [page(fixture(), { academicSkipNotice: false })]), '');
});

test('whitespace-normalized multi-page selections remain bounded', () => {
  const a = page(), b = { text: 'Second page ends here. Do not read further.', mathChanges: [] };
  assert.equal(preparePdfSelection('Ordinary ending. Second page ends here.', [a, b]), 'Ordinary ending.\nSecond page ends here.');
  const styled = page([item('Before \u{1d45e} after.',40,600)]);
  assert.equal(preparePdfSelection('\u{1d45e}', [styled]), '\u{1d45e}');
});

test('disjoint footnote and outline ranges use the same math corrections', () => {
  const data = page();
  const chosen = data.layout.lines.filter(line => /For|Ordinary/.test(line.text)).map(line => line.text).join('\n');
  const text = preparePdfSpeech(chosen, data);
  assert.match(text, /q equals 2/);
  assert.match(text, /Ordinary ending/);
  assert.doesNotMatch(text, /Compare|generic/);
});

test('inline corrections survive PDF line-end hyphen joining', () => {
  const items = fixture();
  items.push(item('Use',40,510),item('q',65,510,'italic'),item('\u0d4c',75,510,'encoded'),item('2',85,510),
    item('for an expla-',100,510),item('nation with ordinary words.',40,494));
  const data = page(items);
  assert.match(preparePdfSpeech(data.text, data), /Use q equals 2 for an explanation/);
});

test('extraction shares evidence within one PDF, samples prior pages locally and releases resources', async () => {
  const later = [item('Use',40,700),item('q',65,700,'italic'),item('\u0d4c',75,700,'encoded'),item('2',85,700)];
  const calls = [], cleaned = []; let destroyed = 0;
  const options = { startPageNumber: 2, endPageNumber: 2, skipHeaders: false, mathSettings: {},
    loadPdfJs: async () => ({ getDocument: () => ({ promise: Promise.resolve({ numPages: 4,
      getPage: async number => { calls.push(number); return {
        getTextContent: async () => ({ items: number === 1 ? fixture() : later }), getViewport: () => viewport,
        cleanup: () => cleaned.push(number),
      }; }, destroy() { destroyed++; },
    }) }) }),
  };
  const pages = await extractPdfPages({ vault: { readBinary: async () => new ArrayBuffer(4) } }, { extension: 'pdf' }, options);
  assert.deepEqual(calls, [1,2]); assert.deepEqual(cleaned, [1,2]); assert.equal(destroyed, 1);
  assert.equal(pages.length, 1);
  assert.match(preparePdfSelection(pages[0].text, pages), /q equals 2/);
});

test('mobile-safe math expressions preserve prefixes without lookbehind', () => {
  assert.match(mathSpeech('a\\tau'), /a times tau/);
  assert.match(mathSpeech('Var[x]'), /variance of x/);
  assert.match(mathSpeech('2 + Var[x]'), /2 plus variance of x/);
});
