const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeAcademicTextForSpeech: clean } = require('../src/speech-text');
const { extractHtmlText } = require('../src/html-text');

test('Markdown and local HTML use the PDF formula reader in both styles', () => {
  for (const academicMathStyle of ['concise', 'verbose']) {
    const options = { academicMathStyle };
    const source = 'The value $x_{i,j}$ follows $r_{t+1}$.';
    const expected = academicMathStyle === 'concise'
      ? 'The value x i j follows r t plus 1.'
      : 'The value x subscript i,j follows r subscript t plus 1.';
    assert.equal(clean(source, options), expected);
    assert.equal(clean(extractHtmlText('<p>' + source + '</p>', options), options), expected);
  }
});

test('formula policy, plain prose, code and emphasis remain safe', () => {
  assert.equal(clean('The value $x_i$ remains.', { academicMathMode:'skip' }), 'The value. Formula. remains.');
  assert.equal(clean('The value $x_i$ remains.', { academicMathMode:'skip', academicSkipNotice:false }), 'The value remains.');
  assert.equal(clean('A **short** note.'), 'A short note.');
  assert.equal(clean('```\n$x_i$\n```\nKeep this.'), 'Keep this.');
  assert.equal(clean('The ratio $f_k(t)=g_k(t)/g_k(1)$ follows.'), 'The ratio. Formula. follows.');
});
