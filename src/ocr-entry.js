'use strict';
const {Modal,Notice,loadPdfJs}=require('obsidian');
const {extractPdfTextLayout}=require('@laginae/note-reader-core');
const isImage=file=>/^(png|jpe?g|webp)$/i.test(file?.extension||'');
const supported=file=>isImage(file)||file?.extension?.toLowerCase()==='pdf';
const t=(plugin,zh,en)=>plugin.settings.settingsLanguage==='chinese'?zh:en;
function openOcr(plugin,file=plugin.getActiveFile()) {
  if(!plugin.settings.ocrEnabled){new Notice(t(plugin,'请先在学术阅读设置中开启“本机 OCR（实验性）”并安装配套资源包。','Enable Local OCR (experimental) in Academic reading and install its matching resource pack first.'));return;}
  if(!supported(file)){new Notice(t(plugin,'请打开 PDF、PNG、JPEG 或 WebP 图片。','Open a PDF, PNG, JPEG or WebP image.'));return;}
  plugin.ocrModal?.close();
  const {mountOcrForm}=require('./portable-ocr-form.cjs');
  class OcrModal extends Modal {
    onOpen(){this.modalEl.classList.add('cozy-ocr-modal');const stamp=[file.stat.size,file.stat.mtime].join(':');
      const verify=()=>{if(plugin.app.vault.getAbstractFileByPath(file.path)!==file||[file.stat.size,file.stat.mtime].join(':')!==stamp)throw Error('OCR_CHANGED');};
      this.form=mountOcrForm(this.contentEl,{experimental:true,chinese:plugin.settings.settingsLanguage==='chinese',hash:__COZY_OCR_HASH__,
        source:{name:file.name,extension:file.extension.toLowerCase(),size:file.stat.size,async read(){verify();const bytes=await plugin.app.vault.readBinary(file);verify();return bytes;},verify},
        loadResources:async signal=>{try{const adapter=plugin.app.vault.adapter,root=plugin.manifest.dir||`${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`,resource=`${root}/ocr-assets/resources.json`;
          const stat=await adapter.stat(resource);if(signal.aborted)throw Error('OCR_CANCELLED');if(!stat||stat.size>32*1024*1024)throw Error('OCR_RESOURCES');return await adapter.readBinary(resource);
        }catch(error){if(signal.aborted)throw error;throw Error('OCR_RESOURCES');}},loadPdf:loadPdfJs,layout:items=>extractPdfTextLayout(items),onClose:()=>this.close(),
        onRead:async text=>plugin.runSafely(async()=>{await plugin.activateView();plugin.startTextSession(text,{kind:'ocr',sourceLabel:`${file.basename||file.name} (OCR)`});})});}
    onClose(){this.form?.dispose();if(plugin.ocrModal===this)plugin.ocrModal=null;}
  }
  plugin.ocrModal=new OcrModal(plugin.app);plugin.ocrModal.open();
}
function registerOcr(plugin){
  plugin.addCommand({id:'ocr-read-file',name:'Recognize PDF or image text (experimental OCR)',icon:'scan-text',callback:()=>openOcr(plugin)});
  plugin.registerEvent(plugin.app.workspace.on('file-menu',(menu,file)=>{if(plugin.settings.ocrEnabled&&supported(file))menu.addItem(item=>item.setTitle(t(plugin,'识别并朗读（实验性 OCR）','Recognize and read (experimental OCR)')).setIcon('scan-text').onClick(()=>openOcr(plugin,file)));}));
  plugin.register(()=>plugin.ocrModal?.close());
}
function addOcrSettings(container,plugin,Setting){
  new Setting(container).setName(t(plugin,'本机 OCR（实验性）','Local OCR (experimental)'))
    .setDesc(t(plugin,'默认关闭，需独立安装配套 ocr-assets 资源包；只识别指定单页，按需加载，切到后台即取消。未完成 iPhone/iPad/Android 真机验证。图片不上传；在线音色会发送识别文字。','Off by default. Install the matching ocr-assets pack separately. One page at a time, loaded on demand; backgrounding cancels OCR. Not validated on physical iPhone/iPad/Android devices. Images stay local; online voices transmit recognized text.'))
    .addToggle(toggle=>toggle.setValue(plugin.settings.ocrEnabled).onChange(async value=>{plugin.settings.ocrEnabled=value;if(!value)plugin.ocrModal?.close();await plugin.saveSettings();}));
}
module.exports={registerOcr,addOcrSettings,openOcr,isImage};
