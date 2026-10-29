const path = require('node:path');
const {buildSync}=require('esbuild');
const resources=require('./ocr-resources.cjs')(process.cwd(),path.resolve('dist/ocr-assets/resources.json'));
buildSync({entryPoints:['src/main.js'],bundle:true,external:['obsidian','@codemirror/state','@codemirror/view'],platform:'browser',format:'cjs',target:'es2020',outfile:'main.js',logLevel:'warning',define:{__COZY_OCR_HASH__:JSON.stringify(resources.sha256)}});
console.log(`Optional OCR resource pack: ${resources.bytes} bytes; excluded from main.js.`);
