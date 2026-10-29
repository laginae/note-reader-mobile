# Cozy Read Aloud Mobile 0.4.1

## Reading and navigation

- Optional passage highlighting, enabled by default, for Markdown reading/editing views, text-based PDFs and accessible local HTML Reader views. Toggle the highlighter icon or Playback > Highlight reading passage without restarting audio.
- Pause retains the mark; next/previous passages update it; Stop and source changes clear stale marks. Matching is conservative: uncertain content is left unmarked. This is not word-level timing or automatic scrolling.
- PDF overlays use the viewer's coordinates and follow zoom/rotation without intercepting text selection. No file annotations are written.
- Markdown outline jumps keep the target heading below the reading toolbar, including narrow layouts and repeated headings.
- Narrow phone controls avoid clipped labels and overlapping sliders. English and Chinese READMEs include three public-sample operation demos.

## Verification and privacy

210 automated tests and the mobile compatibility check passed. Windows Obsidian mobile-layout tests covered Markdown reading/editing, PDF zoom/rotation, playback/highlight controls, four toolbar widths and 22 outline navigation cases. HTML highlighting was checked in a rendered iframe harness, not a real HTML Reader installation. iPhone/iPad/Android physical-device validation of these additions remains pending.

Highlighting adds no speech requests and does not persist source text or modify documents. Tests and demos use invented public content only; no personal notes, PDFs, recording profiles or credentials are included.

**Background playback remains experimental and off by default.** iOS may suspend the app; continuous playback while locked or in the background is not guaranteed and has not passed iPhone/iPad physical-device acceptance.

## 中文说明

- 新增可关闭的段落高亮，默认开启；支持 Markdown 阅读/编辑、文本型 PDF 和可访问的本地 HTML Reader 页面。暂停保留，跳段更新，停止或修改原文后清除，不改变朗读会话。
- 高亮是段落级提示，不是逐字同步或自动滚动；无法可靠定位时不标记，不修改文件，也不额外发送正文。
- 修复 Markdown 大纲跳转被工具栏遮挡，完善窄屏按钮和进度条布局；双语 README 增加三段公开示例动图。
- 自动化与移动布局模拟检查通过，仍需 iPhone/iPad/Android 真机验证。HTML 高亮目前只完成渲染框架测试。
- **移动端后台播放仍为实验性功能，默认关闭；不保证锁屏连续播放。** 不包含私人正文、PDF、账号设置或密钥。
