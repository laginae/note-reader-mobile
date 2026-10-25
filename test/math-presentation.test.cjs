const test = require('node:test');
const assert = require('node:assert/strict');
const { mathSpeech, academicLatex } = require('../src/pdf-speech/academic-speech');

test('mobile formula reader supports named ranges with ell and min/max script labels', () => {
  assert.equal(mathSpeech(String.raw`[\ell,u]`), 'ell to u');
  assert.equal(mathSpeech(String.raw`[\ell,u]`, {mathReadingLanguage:'chinese'}), 'ell 到 u');
  assert.equal(mathSpeech(String.raw`[E_{\min}+R_{\infty}z_{\mathrm d},\ E_{\max}-R_{\infty}z_{\mathrm c}]`),
    'E min plus R infinity times z d to E max minus R infinity times z c');
  assert.equal(mathSpeech('[x,y]'), 'open bracket x,y close bracket');
});

test('mobile formula reader reads font-wrapped variables without weakening skip settings', () => {
  for (const input of [String.raw`z_{\mathrm d}`, String.raw`z_{\mathrm{d}}`, String.raw`z_\mathrm{d}`]) {
    assert.equal(mathSpeech(input), 'z d');
    assert.equal(mathSpeech(input, { academicMathMode: 'skip' }), 'Formula.');
  }
  assert.equal(academicLatex(String.raw`$z_{\mathrm d}$`).trim(), 'z d');
  assert.equal(mathSpeech(String.raw`\bar{\mathrm{x}}_i`), 'x bar i');
  assert.equal(mathSpeech(String.raw`\sum_{i=1}^n x_i`), 'Formula.');
});
