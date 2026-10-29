const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto,createHash}=require('node:crypto');
const {DEFAULT_SETTINGS,normalizeSettings}=require('../src/config');
const {verifyPack,sizeFor,imageDimensions,textFromResult,createOcr}=require('../src/portable-ocr.cjs');
test('mobile OCR is strictly opt-in and packaged outside the startup bundle',()=>{
  assert.equal(DEFAULT_SETTINGS.ocrEnabled,false);for(const source of [{},{ocrEnabled:'true'},{ocrEnabled:1}])assert.equal(normalizeSettings(source).ocrEnabled,false);
  assert.equal(normalizeSettings({ocrEnabled:true}).ocrEnabled,true);
  const main=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8');assert.ok(!main.includes('TesseractCoreWASM'));assert.ok(!main.includes('traineddata.gz"'+':'));
  const bytes=fs.statSync(path.join(__dirname,'../dist/ocr-assets/resources.json')).size;assert.ok(bytes>5_000_000);
});
test('matching resource hash is mandatory before worker creation',async()=>{
  const bytes=new TextEncoder().encode(JSON.stringify({format:1,engine:'tesseract.js@7.0.0',worker:'public fixture'})),hash=createHash('sha256').update(bytes).digest('hex');
  assert.equal((await verifyPack(bytes,hash,webcrypto)).format,1);
  await assert.rejects(verifyPack(bytes,'0'.repeat(64),webcrypto),/OCR_RESOURCES/);
  await assert.rejects(verifyPack(bytes,hash,{}),/OCR_RESOURCES/);
  const signal=AbortSignal.abort();let loaded=false;
  await assert.rejects(createOcr({signal,hash,loadResources:async()=>{loaded=true;return bytes;}}),/OCR_CANCELLED/);assert.equal(loaded,false);
});
test('single-page image recognition enforces dimension bounds and preserves output',()=>{
  const size=sizeFor(4000,3000,1_500_000);assert.ok(size.width*size.height<=1_500_000);
  assert.throws(()=>sizeFor(0,30,1e6),/OCR_IMAGE/);assert.throws(()=>imageDimensions(new Uint8Array(30)),/OCR_IMAGE/);
  assert.equal(textFromResult({text:'Public read-\ning room.',blocks:null}),'Public reading room.');
});
test('OCR packages have matching hashes and contain only local worker resources',async()=>{
  const lock=JSON.parse(fs.readFileSync(path.join(__dirname,'../ocr-source-lock.json')));
  for(const [file,hash] of Object.entries(lock.files))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../src',file))).digest('hex'),hash);
  const folder=path.join(__dirname,'../dist/ocr-assets'),manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'))),bytes=fs.readFileSync(path.join(folder,'resources.json'));
  const pack=await verifyPack(bytes,manifest.sha256,webcrypto);assert.match(pack.worker,/OCR_NETWORK_DISABLED/);assert.match(pack.worker,/cacheMethod|loadLanguage/);
});
test('OCR worker terminates on abort during initialization',async()=>{
  const controller=new AbortController(),bytes=new TextEncoder().encode(JSON.stringify({format:1,engine:'tesseract.js@7.0.0',worker:'fixture'})),hash=createHash('sha256').update(bytes).digest('hex');
  let worker,terminations=0;
  class Worker{constructor(){worker=this;}postMessage(){queueMicrotask(()=>controller.abort());}terminate(){terminations++;}}
  await assert.rejects(createOcr({signal:controller.signal,hash,loadResources:async()=>bytes,win:{Worker,crypto:webcrypto,Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}}}),/OCR_CANCELLED/);
  assert.ok(worker);assert.equal(terminations,1);
});
