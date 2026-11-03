# Cozy Read Aloud Mobile 0.8.0

## Playback and Outline Controls

- Fix pinned mini outlines disappearing when switching notes or tabs. Keep the outline open with the active document's headings, without scanning background documents or changing focus/playback. Manual close/unpin is respected, and stale asynchronous loads cannot replace the new outline.

- Synchronize **Floating playback controls** with the desktop edition. The optional lower-right pause/resume control can include Stop above it. Touch keeps both controls visible with at least 44-pixel targets; desktop hover/keyboard focus reveals Stop without moving Pause. The controls never start a new reading session.
- Put **Show stop reading button**, on by default, inside the initially collapsed **More floating control options**. Folding changes only the settings display. Turning the main switch off hides the group; re-enabling it preserves the saved stop-button choice. UI preferences do not restart synthesis.
- Add mini-outline pause/resume, configurable header visibility and Auto / Chapter lines / Outline icon collapsed entries. Touch uses tap rather than requiring hover. Chapter lines reuse loaded headings and mark reading with color only, not an extra dot or thicker stroke.
- Retain heading actions through context menus and top options without row-end menu buttons. Navigation adapts to narrow panes, and explicit hiding/Floating TOC coexistence still takes priority.

## Concise Formula Speech

Synchronize conservative interval, short-set, function-argument and bracket simplifications. Ambiguous short pairs use neutral pauses rather than assumed interval meaning. Preserve verbose structure, original highlight positions, explicit skipping and smart-mode complexity safeguards. Start a new session for changed speech; already prepared audio is unchanged.

## Validation and Limits

Automated checks and browser touch simulations use public invented examples only. This release has not completed iPhone, iPad or Android physical-device acceptance. **Mobile background playback remains experimental.** Optional OCR and OpenAI Realtime also retain their experimental labels and existing opt-in requirements. No private documents, settings or credentials are distributed, and no new speech service or startup document scan is added.

## 中文摘要

- 修复固定目录在切换笔记或标签页后消失：保持展开并更新当前文档目录；关闭或取消固定后不再自动展开，不扫描后台文档，旧加载结果不覆盖新目录。

- 与桌面版同步“悬浮播放控制”和默认折叠的“更多悬浮按钮选项”。“显示停止朗读按钮”默认开启；折叠不关闭功能，重新启用主开关保留原选择。
- 触屏端暂停／继续与停止按钮常显，沿用已有播放流程；迷你目录的章节短线、播放按钮和紧凑章节操作一并发布。朗读短线仅变色，不加粗、不增加圆点。
- 简洁公式朗读保留语义及复杂公式智能跳过；完整模式不变。
- 移动端后台播放仍为实验性功能，iPhone／iPad／Android 真机验收仍待完成。OCR 和 OpenAI Realtime 的实验性边界不变。不发布私人正文、设置或密钥。
