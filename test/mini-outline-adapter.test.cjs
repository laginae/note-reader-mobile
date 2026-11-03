'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {mobileMiniAdapter}=require('../src/mini-outline-adapter');
function fixture() {
  const calls=[], file={path:'public-example.md',extension:'md',stat:{mtime:1}};
  const text='# One\nPublic introduction.\n## Child\nPublic detail.\n# Two\nPublic conclusion.';
  const view={file,editor:{getValue:()=>text}};view.leaf={view};
  const plugin={settings:{},app:{workspace:{revealLeaf:async leaf=>calls.push(['reveal',leaf])}},
    documentOutlineKey:f=>String(f.stat.mtime),isOutlineCurrent:(f,key)=>String(f.stat.mtime)===key,
    startTextSession:async(...args)=>calls.push(['read',...args]),readPdfSection:async(...args)=>calls.push(['section',...args]),
    locateOutlineEntry:async(...args)=>calls.push(['locate',...args])};
  return {adapter:mobileMiniAdapter(plugin),plugin,view,file,text,calls};
}

test('mobile pause adapter reuses queue controls and never treats export or completed audio as playable', () => {
  const f=fixture();assert.equal(f.adapter.playback().active,false);
  f.plugin.queue={items:[{}],status:'synthesizing'};f.plugin.sessionId=7;f.plugin.sourceLabel='Public sample';
  assert.deepEqual(f.adapter.playback(),{active:true,session:7,paused:false,canToggle:true,canStop:true,title:'Public sample'});
  f.plugin.togglePause=()=>{f.plugin.pauseRequested=true;};f.adapter.togglePlayback();assert.equal(f.adapter.playback().paused,true);
  let stopped;f.plugin.stopReading=options=>{stopped=options;};f.adapter.stopPlayback();assert.deepEqual(stopped,{quiet:true});
  f.plugin.phaseOverride='extracting';assert.equal(f.adapter.playback().canToggle,false);f.plugin.phaseOverride='';
  f.plugin.queue.status='complete';assert.equal(f.adapter.playback().active,false);
  f.plugin.queue.status='paused';f.plugin.exportModal={busy:true};assert.equal(f.adapter.playback().active,false);
  assert.deepEqual(f.calls,[]);
});
test('mobile reads current editor without a vault read and section choice retains exact bounds',async()=>{
  const f=fixture(),data=await f.adapter.load(f.view,()=>false);
  assert.equal(data.entries.length,3);await f.adapter.locate(f.view,data,1);assert.equal(f.calls.at(-1)[0],'locate');
  await f.adapter.read(f.view,data,0,false);assert.equal(f.calls.at(-1)[1],f.text.slice(0,f.text.indexOf('# Two')));
  await f.adapter.read(f.view,data,1,true);assert.equal(f.calls.at(-1)[1],f.text.slice(f.text.indexOf('## Child')));
  f.view.editor.getValue=()=>f.text+'edited';await assert.rejects(f.adapter.read(f.view,data,0,true));
});
test('HTML uses current rendered headings; duplicate titles have distinct targets and DOM changes invalidate',async t=>{
  const f=fixture(),dom=new JSDOM('<h1>Overview</h1><p>First.</p><h1>Overview</h1><p>Second.</p>');t.after(()=>dom.window.close());
  f.file.extension='html';f.view.mainView={iframe:{contentDocument:dom.window.document}};
  const data=await f.adapter.load(f.view,()=>false);assert.equal(data.entries.length,2);assert.notEqual(data.entries[0].element,data.entries[1].element);
  assert.equal(f.adapter.valid(f.view,data),true);data.entries[1].element.textContent='New title';assert.equal(f.adapter.valid(f.view,data),false);
});
test('PDF adapter reuses existing cache API and never passes PDF into the text-only branch',async()=>{
  const f=fixture();f.file.extension='pdf';let loads=0;
  f.plugin.loadPdfOutline=async()=>{loads++;return {data:{entries:[{title:'Overview',level:1,page:1,offset:0}],pages:[]}};};
  assert.equal(loads,0);const data=await f.adapter.load(f.view,()=>false);assert.equal(loads,1);assert.equal(data.kind,'pdf');
  await f.adapter.read(f.view,data,0,false);assert.equal(f.calls.at(-1)[0],'section');assert.equal(f.calls.at(-1)[3].kind,undefined);
  f.plugin.exportModal={busy:true};await assert.rejects(f.adapter.read(f.view,data,0,true));
});
test('reading marker is available with highlighting off and does not follow a stale document',async()=>{
  const f=fixture(),data=await f.adapter.load(f.view,()=>false);
  f.plugin.queue={items:[{}],currentIndex:0,status:'paused'};
  f.plugin.readingHighlights={session:{file:f.file,mtime:1,text:f.text,kind:'markdown',ranges:[[{kind:'markdown',from:f.text.indexOf('## Child')}]]}};
  f.plugin.settings.readingHighlight=false;assert.equal(f.adapter.positions(f.view,data).reading,1);
  f.file.stat.mtime++;assert.equal(f.adapter.positions(f.view,data).reading,-1);
});

test('edge navigation uses the active source and rejects cancelled or changed targets after revealing its pane', async () => {
  const f=fixture(),data=await f.adapter.load(f.view,()=>false),scrolls=[];
  f.view.editor.scrollIntoView=range=>scrolls.push(range);
  await f.adapter.locateEdge(f.view,data,false);await f.adapter.locateEdge(f.view,data,true);
  assert.equal(scrolls.length,2);assert.equal(f.calls.some(call=>call[0]==='read'),false);
  let cancelled=false;f.plugin.app.workspace.revealLeaf=async()=>{cancelled=true;};
  await f.adapter.locateEdge(f.view,data,true,()=>cancelled);assert.equal(scrolls.length,2);
  f.plugin.app.workspace.revealLeaf=async()=>{f.view.file={...f.file,path:'replacement-public.md'};};
  await assert.rejects(f.adapter.locateEdge(f.view,data,true));assert.equal(scrolls.length,2);
});
