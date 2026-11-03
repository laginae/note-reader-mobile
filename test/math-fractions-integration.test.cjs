'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeAcademicTextForSpeech: clean } = require('../src/speech-text');
const { extractHtmlText } = require('../src/html-text');
const { markdownHighlightSource } = require('../src/highlight-source');
const { extractPdfTextLayout } = require('@laginae/note-reader-core');
const { pdfMathChanges } = require('../src/pdf-speech/pdf-math');
const { preparePdfSpeech, preparePdfSelection } = require('../src/pdf-speech');

test('Markdown and HTML keep original highlight source when fractions use natural grouping', () => {
  const raw = String.raw`结果为 $(x-y)/\bar z$。`, speech = clean(raw);
  assert.equal(speech, '结果为 x 减 y 的差 除以 z bar。');
  const source = markdownHighlightSource(raw, [speech], clean, { sourceText: raw });
  assert.equal(raw.slice(source.ranges[0][0].from, source.ranges[0][0].to), raw);
  assert.equal(clean(extractHtmlText('<p>' + raw + '</p>', {})), speech);
});

test('recognized inline PDF fractions agree for page and selection reading without changing coordinates', () => {
  const item = (str, x, fontName = 'body') => ({ str, width: str.length * 6, height: 12, fontName, transform: [12, 0, 0, 12, x, 700] });
  const items = [item('The value', 20), item('(α-β)/γ', 100, 'math'), item('is bounded.', 220)];
  const original = JSON.stringify(items), viewport = { width: 600, height: 800 };
  const layout = extractPdfTextLayout(items, { viewport });
  for (const academicMathStyle of ['concise', 'verbose']) {
    const settings = { academicMathStyle }, mathChanges = pdfMathChanges(layout, items, settings, { math: 'CMMI10' });
    const page = { text: layout.text, layout, mathChanges };
    const speech = preparePdfSpeech(page.text, page);
    assert.equal(preparePdfSelection(page.text, [page]), speech);
    assert.match(speech, academicMathStyle === 'concise' ? /the difference of alpha and beta, divided by gamma/ : /open parenthesis/);
    assert.equal(mathChanges[0].omitted.length, 0);
    assert.ok(mathChanges[0].source.includes('(α-β)/γ'));
  }
  assert.equal(JSON.stringify(items), original);
  assert.ok(layout.text.includes('(α-β)/γ'));
});
