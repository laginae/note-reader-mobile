const test=require('node:test'),assert=require('node:assert/strict');
const {cases,viewport}=require('../scripts/pdf-golden-fixtures.cjs');
assert.deepEqual({cases,viewport},require('@laginae/note-reader-core/test/pdf-golden-fixtures'), 'Shared public corpus must match the pinned core release');
const {extractPdfTextLayout}=require('@laginae/note-reader-core');
const {pdfMathChanges}=require('../src/pdf-speech/pdf-math');
const {preparePdfSpeech,preparePdfSelection}=require('../src/pdf-speech');
const compact=x=>x.replace(/\s+/g,' ').trim();
for(const f of cases)test('PDF golden full and selection: '+f.name,()=>{
 const layout=extractPdfTextLayout(f.items,{viewport}),options={academicMathMode:'smart',mathReadingLanguage:'english',academicMathStyle:'concise',academicSkipNotice:true};
 const page={text:layout.text,layout,mathChanges:pdfMathChanges(layout,f.items,options)};
 assert.equal(compact(preparePdfSpeech(page.text,page)),f.golden);
 assert.equal(compact(preparePdfSelection(page.text,[page])),f.golden);
});
