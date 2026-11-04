# Cozy Read Aloud Mobile 0.8.3

## PDF Outline Recognition

- Sync the local outline detection rules from desktop 1.7.3, using relative font size, heading font identity, numbering and document structure for main headings and same-size subheadings.
- Use Obsidian's local PDF character maps and font resources for affected CID-font PDFs, including Chinese documents. No external recognition service or new OCR/model dependency is added.
- Keep supported wrapped theorem-related headings complete when column position, spacing and typography agree. Distinguish topic headings about a theorem from its statement or proof body.
- Preserve supported ordinary-font section headings containing digits or verbs; require corroborating language and layout evidence before excluding numeric body continuations.
- Preserve existing-bookmark priority and original source offsets for section navigation, highlighting and reading. Processing stays on demand; outline detection does not rewrite source documents.

## Verification and Limits

- Passed 412 automated tests and the 48-file mobile compatibility check. Coverage includes heading typography, wrapped references, numeric prose, column boundaries, existing bookmarks and source offsets.
- Public English/Chinese PDF fixtures were checked through both extraction paths. These are automated desktop-hosted checks, not phone or tablet validation; complex PDF layouts may still need review.
- **Mobile background playback remains experimental. Current-release iPhone, iPad and Android physical-device validation is still pending.**
- OCR remains optional, disabled by default and separate from the main plugin. Use the matching optional resource archive when enabling it; the experimental mobile OCR scope is unchanged.
- Published examples and regression fixtures are synthetic or public. No private document text, credentials, installed settings, diagnostic extracts or local backups are included. No online speech synthesis was required.

After updating, reload the plugin or restart Obsidian, then reopen or refresh the PDF outline. Existing settings and credentials are preserved.

## 中文摘要

同步桌面版的中文 PDF 字体映射、标题字号与字体识别、跨行标题合并和数字正文排除规则，减少漏识别及误删正常章节。保留已有书签优先和原文定位，不新增启动扫描或 OCR 依赖。已通过自动化测试与移动兼容性检查，但并非真机验收。**移动端后台播放仍为实验性功能，本次 iPhone、iPad、Android 真机验证尚待完成。** 更新后重启 Obsidian，并重新打开或刷新 PDF 目录；复杂版式仍建议核对。
