const test = require('node:test');
const assert = require('node:assert/strict');
const { mathSpeech, academicLatex } = require('@laginae/note-reader-core/academic-speech');

test('mobile pinned core supports named ranges with ell and min/max script labels', () => {
  assert.equal(mathSpeech(String.raw`[\ell,u]`), 'ell to u');
  assert.equal(mathSpeech(String.raw`[\ell,u]`, {mathReadingLanguage:'chinese'}), 'ell 到 u');
  assert.equal(mathSpeech(String.raw`[E_{\min}+R_{\infty}z_{\mathrm d},\ E_{\max}-R_{\infty}z_{\mathrm c}]`),
    'E sub min plus R sub infinity times z sub d to E sub max minus R sub infinity times z sub c');
  assert.equal(mathSpeech('[x,y]'), 'open bracket x,y close bracket');
});

test('pinned mobile core reads font-wrapped variables without weakening skip settings', () => {
  for (const input of [String.raw`z_{\mathrm d}`, String.raw`z_{\mathrm{d}}`, String.raw`z_\mathrm{d}`]) {
    assert.equal(mathSpeech(input), 'z sub d');
    assert.equal(mathSpeech(input, { academicMathMode: 'skip' }), 'Formula omitted.');
  }
  assert.equal(academicLatex(String.raw`$z_{\mathrm d}$`).trim(), 'z sub d');
  assert.equal(mathSpeech(String.raw`\bar{\mathrm{x}}_i`), 'x bar sub i');
  assert.equal(mathSpeech(String.raw`\sum_{i=1}^n x_i`), 'Formula omitted.');
});
