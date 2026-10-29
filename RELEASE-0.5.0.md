# 0.5.0 - Experimental optional OCR

- Recognize and read printed text from one selected scanned PDF page or a PNG/JPEG/WebP image. Review and edit the result before reading all or selected text.
- **Disabled by default, separate resource pack, single-page recognition, experimental status.** Normal startup does not load OCR models. No automatic model/code download occurs.
- Install the matching `cozy-mobile-ocr-resources.zip` release asset: copy its complete `ocr-assets` folder into the plugin directory. The independent pack is hash-verified, approximately 6.2 MB compressed / 10 MB unpacked. Obsidian's normal three-file plugin update does not install it.
- Recognition is bounded, cancellable and stopped on backgrounding. Workers are released after completion, cancellation or closing. Models can still use hundreds of MB of active memory.

**OCR and background playback remain experimental. Physical iPhone, iPad and Android acceptance for this build is deferred, not passed.** Background playback remains off by default. OS suspension or interruptions may pause audio; return to the foreground and resume manually. Desktop/browser simulations do not establish current-device compatibility.

OCR does not upload source images or save recognized text to settings/logs. Online voices still send selected recognized text under existing consent. Formulas, handwriting, tables and complex layouts require review. Original-image highlighting, OCR outlines and searchable PDF creation are not included.

No private documents, personal text, API keys or captured provider responses are included. No paid speech requests were added. See the bilingual [installation guide and device test checklist](https://github.com/laginae/note-reader-mobile/blob/0.5.0/docs/local-ocr.md).
