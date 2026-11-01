# Cozy Read Aloud Mobile 0.6.1

## Mini Outline Refinements

- Sync grouped settings, width controls, one-to-four-line headings and display-only Markdown title cleanup with the desktop edition. Reading shortcuts appear first; secondary outline preferences are grouped under More outline options.
- Keep touch controls and the Close button visible, with a solid background and larger targets. Search and level controls expand on demand. Document top/bottom actions are in Outline options on touch layouts; they navigate without starting speech.
- Add optional startup opening: after workspace restoration, open and pin only the active supported document's outline, hide the side button and leave speech and document position unchanged. Off by default; dismissal prevents reopening during that session. Initial analysis of the active PDF may still take time; background tabs and the vault are not scanned.
- Support a responsive 260-600 pixel width, two heading lines by default, full-title expansion and unpin-to-close. Optional transparent backgrounds, mouse double-click reading and idle header hiding apply to desktop mouse use; touch navigation stays explicit.
- Fix toolbar overlap and mouse-first hybrid-device header visibility. Preserve Floating TOC coexistence and existing voice preferences; outline preference changes do not interrupt playback.

**Mobile background playback remains experimental and off by default. OCR remains experimental, default-off, separately packaged and limited to one page at a time.** No new iPhone, iPad or Android physical-device validation is claimed. Automated public fixtures and browser layout checks passed; see the device checklist for rotation, split view, keyboard and touch-menu testing. No private text, keys or local test artifacts are included.

## 中文

- 同步桌面版设置分组、宽度调节、一至四行标题和仅影响显示的 Markdown 标题清理。“朗读快捷入口”在前，次要目录选项折叠收纳。
- 触屏顶栏和关闭按钮保持常显，保留实色背景与较大点击区域；搜索、层级选项按需展开。“到文档顶部／底部”放在目录选项中，只定位，不自动朗读。
- 可选启动后自动打开并固定当前文档目录、隐藏侧边按钮，默认关闭。不启动朗读或改变文档位置，手动收起后本次不再自动弹出；当前 PDF 可能需要初次分析，但不扫描全库或后台标签页。
- 宽度可设 260–600 像素并适配窄窗口，标题默认两行，菜单可展开全文，取消固定即收起。透明背景、双击朗读和顶栏悬停显隐适用于桌面鼠标操作，触屏仍采用明确的点击操作。
- 修正工具栏重叠及混合输入设备顶栏显隐问题，保持与 Floating TOC 共存，不改动其他插件或原有音色设置。

**移动端后台播放仍为实验性、默认关闭；OCR 同样为实验性、默认关闭、独立资源包、单页识别。** 本次没有新增 iPhone、iPad 或 Android 真机验收；已完成公开示例的自动化和浏览器布局检查。发布不含私人正文、密钥或本地测试资料。
