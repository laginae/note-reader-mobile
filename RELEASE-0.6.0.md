# Cozy Read Aloud Mobile 0.6.0

- Add a touch-friendly mini outline for Markdown, text PDFs and local HTML Reader. Open it without starting speech, search headings, choose expanded levels, pin it or close it explicitly.
- Tap a title to navigate only; Play reads from that section, and the row menu reads only that section and its descendants. Browsing and reliably mapped reading positions have separate markers.
- Auto mode coexists with Floating TOC by hiding only Cozy's edge entry; command and toolbar access remain. Left/right placement and explicit entry visibility are configurable. Other plugin files and settings are untouched.
- Independent list scrolling and viewport-aware height leave room for application navigation. Changing directory preferences does not interrupt playback. Existing PDF caches and reading logic are reused; no startup PDF parsing or whole-vault scan.
- Directory state stays in memory. Changed documents and closed panes cannot trigger old navigation or reading actions.

**Mobile background playback remains experimental and off by default. OCR also remains experimental, default-off, separately packaged and limited to one page.** No new iPhone, iPad or Android physical-device acceptance is claimed. Automated tests and browser layout checks use only public/synthetic samples; please follow the device checklist for rotation, split view, the keyboard and native selection gestures.

## 中文

新增触控迷你目录，支持搜索、层级展开、固定和独立滚动。标题只跳转，播放按钮从本节继续，更多菜单只读本节及子节。默认兼顾 Floating TOC 共存，不修改第三方插件；目录关闭时不额外解析 PDF，调整目录设置不打断播放。

**移动端后台播放仍为实验性、默认关闭。OCR 同样为实验性、默认关闭、独立资源包、单页识别。** 本次没有新增手机或平板真机验收结论；已做自动化与浏览器尺寸检查。请按清单测试键盘、旋转、iPad 分屏与原生选区手势。发布不含私人正文或密钥。
