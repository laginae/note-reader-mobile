const test = require('node:test');
const assert = require('node:assert/strict');
const {cases,viewport}=require('../scripts/pdf-acceptance-fixtures.cjs');
const {extractPdfTextLayout}=require('@laginae/note-reader-core');
const {pdfMathChanges}=require('../src/pdf-speech/pdf-math');
const {preparePdfSpeech,preparePdfSelection}=require('../src/pdf-speech');
const compact=text=>text.replace(/\s+/g,' ').trim();
for(const fixture of cases) test(`PDF acceptance: ${fixture.name}, full and selection parity`,()=>{
  const original=JSON.stringify(fixture.items);
  for(const mode of ['smart','all','skip']) {
    const settings={academicMathMode:mode,mathReadingLanguage:'english',academicMathStyle:'concise',academicSkipNotice:true};
    const layout=extractPdfTextLayout(fixture.items,{viewport});
    const page={text:layout.text,layout,mathChanges:pdfMathChanges(layout,fixture.items,settings)};
    const full=preparePdfSpeech(page.text,page),selected=preparePdfSelection(page.text,[page]);
    assert.equal(compact(selected),compact(full));
    assert.equal(JSON.stringify(fixture.items),original);
    if(mode==='smart') assert.match(compact(full),fixture.expected);
  }
});
