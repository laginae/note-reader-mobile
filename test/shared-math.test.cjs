'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { cases } = require('@laginae/note-reader-core/test/math-golden-fixtures');
const shared = require('@laginae/note-reader-core/academic-speech');
const adapter = require('../src/pdf-speech/academic-speech');
const { sanitizeAcademicTextForSpeech } = require('../src/speech-text');
const core = require('@laginae/note-reader-core');
test('mobile PDF and text paths share the pinned formula implementation and preserve prose', () => {
  assert.equal(adapter, shared);
  assert.equal(sanitizeAcademicTextForSpeech('The value of $f(x)$.', { academicFunctionStyle: 'compact' }), 'The value of f x.');
  assert.equal(sanitizeAcademicTextForSpeech('The value of $f(x)$.'), 'The value of f of x.');
});
for (const example of cases) test('mobile shared formula: ' + example.name, () => {
  assert.equal(adapter.mathSpeech(example.formula, example.options), example.expected);
  const text = '$' + example.formula + '$';
  assert.equal(sanitizeAcademicTextForSpeech(text, example.options), core.sanitizeAcademicTextForSpeech(text, example.options));
});
