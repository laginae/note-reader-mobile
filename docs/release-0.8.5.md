# Cozy Read Aloud Mobile 0.8.5

- Add **Repeat table headers for each row**, on by default, matching desktop. Disable it to announce headings once, then read row numbers and values; blank cells retain a short placeholder.
- Keep Smart / All / Skip policy independent. Long numeric tables retain existing smart omission rules.
- Pin Core 0.3.1 at `f0e6195fdda69e49c1bb54c21c0187eb005b6322`. Markdown and simple HTML share the formatter; complex spans, partial selections and unstructured PDF text retain conservative handling.
- **Mobile background playback remains experimental. Current-release iPhone, iPad and Android physical-device validation is pending.** OCR remains experimental, off by default, separately packaged and single-page.
- Tests use invented public examples and mock audio. No real online synthesis, private prose, PDFs, credentials, installed settings or diagnostics are published.

Reload/restart the plugin and start a new session after changing wording. Existing engine, voice and credential choices are preserved.

## 中文摘要

同步默认开启的“每行重复表头”，关闭后开头读一次表头，再逐行读数据；空单元格保留占位，智能跳过策略不变。使用核心库 0.3.1，不强行推断不可靠 PDF 或复杂表格表头。后台播放与 OCR 仍为实验性功能，真机验收待完成，不包含私人正文或密钥。
