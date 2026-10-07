const test = require('node:test');
const assert = require('node:assert/strict');
const { markdownOutline, htmlOutline, sectionText } = require('../src/document-outline');
const { splitTextForSpeechChunks, createIncrementalSpeechChunker } = require('../src/sentence-chunker');
test('a final sentence moves intact to the next chunk even after a short first sentence', () => {
  const sentence = 'This sentence should remain intact instead of being cut into pieces.';
  assert.deepEqual(splitTextForSpeechChunks(`Short. ${sentence}`, [70]), ['Short.', sentence]);
});
test('long sentences respect hard limits without losing characters or splitting surrogate pairs', () => {
  const text = '这是一个很长的句子，'.repeat(40) + '结束。';
  const parts = splitTextForSpeechChunks(text, [200]);
  assert.equal(parts.join(''), text); assert.ok(parts.every((p) => p.length <= 200));
  const emoji = splitTextForSpeechChunks('甲😀乙😀丙', [2]);
  assert.equal(emoji.join(''), '甲😀乙😀丙');
  assert.ok(emoji.every((p) => !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(p)));
});
test('cross-page continuation stays together and carries its starting page', () => {
  const c = createIncrementalSpeechChunker([100], { detailed: true });
  c.push('The result continues', { page: 1 }); c.push('on the next page.', { page: 2 });
  assert.deepEqual(c.finish(), [{ text: 'The result continues on the next page.', metadata: { page: 1 } }]);
});
test('Markdown ignores fenced examples and frontmatter; sections include children', () => {
  const source = '---\ntitle: Demo\n---\n# One\nintro\n## Child\nbody\n```md\n# Not a heading\n```\n# Two\nend';
  const data = markdownOutline(source);
  assert.deepEqual(data.entries.map((e) => e.title), ['One', 'Child', 'Two']);
  assert.ok(sectionText(data, 0, false).includes('## Child')); assert.ok(!sectionText(data, 0, false).includes('# Two'));
  assert.ok(sectionText(data, 1, true).includes('# Two'));
});
test('HTML headings preserve hierarchy, entities, IDs and duplicate section offsets', () => {
  const data = htmlOutline('<nav><h2>Menu</h2></nav><h1 id="a">A &amp; B</h1><p>first</p><h2>Same</h2><p>child</p><h1>Same</h1><p>last</p><h2 hidden>Hidden</h2>');
  assert.deepEqual(data.entries.map((e) => e.title), ['A & B', 'Same', 'Same']);
  assert.equal(data.entries[0].id, 'a');
  assert.match(sectionText(data, 2, false), /^Same\n+last$/);
  assert.ok(!sectionText(data, 0, false).includes('last'));
});
