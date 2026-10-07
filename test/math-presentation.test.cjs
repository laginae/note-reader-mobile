const test = require('node:test');
const assert = require('node:assert/strict');
const { mathSpeech, academicLatex } = require('@laginae/note-reader-core/academic-speech');

test('pinned mobile core reads font-wrapped variables without weakening skip settings', () => {
  for (const input of [String.raw`z_{\mathrm d}`, String.raw`z_{\mathrm{d}}`, String.raw`z_\mathrm{d}`]) {
    assert.equal(mathSpeech(input), 'z sub d');
    assert.equal(mathSpeech(input, { academicMathMode: 'skip' }), 'Formula omitted.');
  }
  assert.equal(academicLatex(String.raw`$z_{\mathrm d}$`).trim(), 'z sub d');
  assert.equal(mathSpeech(String.raw`\bar{\mathrm{x}}_i`), 'x bar sub i');
  assert.equal(mathSpeech(String.raw`\sum_{i=1}^n x_i`), 'Formula omitted.');
});
