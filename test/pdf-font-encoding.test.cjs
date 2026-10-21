const test = require('node:test');
const assert = require('node:assert/strict');
const { extractPdfTextLayout } = require('@laginae/note-reader-core');
const { pdfMathChanges, applyPdfMathChanges } = require('../src/pdf-speech/pdf-math');

const { fixture, item, viewport } = require('./pdf-fixtures.cjs');
function run(items, settings = {}) {
  const layout = extractPdfTextLayout(items,{viewport});
  const mathChanges = pdfMathChanges(layout,items,settings);
  const speech = applyPdfMathChanges(layout.text,mathChanges);
  assert.equal(layout.text, extractPdfTextLayout(items,{viewport}).text);
  for (const omitted of mathChanges.flatMap(change=>change.omitted))
    assert.ok(items.some(t=>t.str===omitted.str && t.transform[4]===omitted.x && t.transform[5]===omitted.y));
  return { speech, mathChanges };
}
test('damaged font signature filters complete display math and repairs short inline operators',()=>{
  const {speech}=run(fixture());
  assert.equal((speech.match(/Formula\./g)||[]).length,1);
  assert.doesNotMatch(speech,/[\u0b00-\u0dff\u1200-\u137f]|\(9\)/);
  assert.match(speech,/For q equals 2 the result holds/);
  assert.match(speech,/alpha less than beta/);
  assert.match(speech,/open parenthesis 1 minus q close parenthesis/);
  assert.match(speech,/Ordinary ending/);
});
test('selection font fallback and notice settings preserve the same original source mapping',()=>{
  const items=fixture().map(t=>({...t,fontName:'fallback'}));
  assert.match(run(items).speech,/q equals 2/);
  assert.doesNotMatch(run(items,{academicSkipNotice:false}).speech,/Formula|\u0d4c|\(9\)/);
  assert.doesNotMatch(run(items,{academicMathMode:'skip'}).speech,/q equals 2|\u0d4c/);
});
test('normal multilingual prose and isolated lookalike characters are never globally replaced',()=>{
  const samples=['\u1200\u123a\u123b \u0d15\u0d4c\u0d46 \u0d9a\u0dcd',
    '\u123a\u123b\u123c\u123d', 'Example \u0d4c character.'];
  for(const str of samples) {
    const items=[item(str,40,700)];
    assert.equal(run(items).speech,str);
  }
  const items=fixture();
  items.push(item('\u0d15\u0d32\u0d02',40,530,'language'));
  assert.match(run(items).speech,/\u0d15\u0d32\u0d02/);
});

test('font evidence is scoped to one PDF and uncertain symbols are omitted rather than guessed',()=>{
  const context=new Set(), items=fixture(), layout=extractPdfTextLayout(items,{viewport});
  pdfMathChanges(layout,items,{}, {}, context);
  const later=[item('Use',40,700),item('q',65,700,'italic'),item('\u0d4c',75,700,'encoded'),item('2',85,700)];
  const next=extractPdfTextLayout(later,{viewport});
  assert.match(applyPdfMathChanges(next.text,pdfMathChanges(next,later,{}, {}, context)),/q equals 2/);
  assert.match(applyPdfMathChanges(next.text,pdfMathChanges(next,later)),/\u0d4c/);
  const uncertain=fixture();
  uncertain.push(item('Unknown expression',40,530),item('q',150,530,'italic'),item('\u0d4c \u0d64',165,530,'encoded'),item('2',190,530));
  const speech=run(uncertain).speech;
  assert.doesNotMatch(speech,/\u0d64|\ufffd/);
  assert.match(speech,/Unknown expression\. Formula\./);
});


module.exports = { fixture, item, viewport };
