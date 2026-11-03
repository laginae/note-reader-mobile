# Cozy Read Aloud Mobile 0.8.1

- Keep the collapsed mini-outline entry across note/tab switches and when returning. Touch Auto retains its large icon target; the optional chapter-line style follows the active document. Explicit hiding and Floating TOC coexistence remain authoritative.
- Load only the active Markdown/local HTML outline. A collapsed PDF entry uses an already cached outline or stays an icon until opened; it does not trigger extra PDF analysis or scan background notes.
- Add optional **Show 5-second seek buttons** under **Floating playback controls > More floating control options**, off by default. When enabled, Back/Forward appears beside Pause and remains visible on touch. Buttons are disabled when seeking is unavailable, including device system speech, and hidden when space is insufficient. Mobile seeking remains within the current loaded online audio; this is not cross-segment seeking.
- Synchronize playback controls and outline behavior with desktop 1.7.1. The linked desktop walkthrough now demonstrates transparent background; it is not mobile-device validation.

**Mobile background playback remains experimental.** Optional OCR and Realtime retain their existing experimental/opt-in boundaries. Automated checks and browser touch simulations do not replace physical iPhone/iPad/Android tests; current-release device acceptance remains pending.

Existing settings and credentials are preserved. Only audited public source and release assets are distributed, with no private prose, account keys or installed settings.

## 中文摘要

- 收起后的目录入口随笔记切换，返回原笔记仍可用；触屏自动样式保持大图标，隐藏入口和 Floating TOC 共存规则不变。
- 新增默认关闭的前后 5 秒悬浮按钮，触屏常显，空间不足时隐藏；仅定位当前已加载的在线音频，设备系统语音不可用时禁用。
- 不额外解析 PDF 或预读后台笔记，不改变朗读状态。
- **移动端后台播放仍为实验性功能**；浏览器模拟不等于真机测试，iPhone/iPad/Android 验收仍待完成。不发布私人正文、密钥或本地设置。
