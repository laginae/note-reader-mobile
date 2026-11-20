'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { addAcademicPreview } = require('../src/academic-preview');
const { sanitizeAcademicTextForSpeech } = require('../src/speech-text');

test('preview is lazy, uses fixed examples and the mobile speech formatter, and updates table and formula wording', t => {
  const dom = new JSDOM('<main></main>'); t.after(()=>dom.window.close());
  const doc = dom.window.document;
  dom.window.HTMLElement.prototype.createEl = function(tag,{cls='',text=''}={}) {
    const el=doc.createElement(tag); el.className=cls; el.textContent=text; this.append(el); return el;
  };
  let calls=0; const settings={mathReadingLanguage:'english'};
  const refresh=addAcademicPreview(doc.querySelector('main'),'english',sample=>{
    calls++;return sanitizeAcademicTextForSpeech(sample,settings);
  });
  const box=doc.querySelector('details'), outputs=doc.querySelectorAll('dd');
  refresh(); assert.equal(calls,0); box.open=true; refresh(); assert.equal(calls,3);
  assert.match(outputs[0].textContent,/f of x/); assert.match(outputs[1].textContent,/excluding/);
  const original=outputs[2].textContent;
  Object.assign(settings,{academicFunctionStyle:'compact',academicIntervalStyle:'range',academicTableRepeatHeaders:false}); refresh();
  assert.doesNotMatch(outputs[0].textContent,/ of /); assert.doesNotMatch(outputs[1].textContent,/excluding/);
  assert.notEqual(outputs[2].textContent,original);
});
