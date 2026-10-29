# Mobile Operation Demos

[English README](../../README.md) | [中文 README](../../README.zh-CN.md)

## Clips

- [Playback controls](../images/mobile-controls-demo.gif), about 26 seconds: open the mobile action menu, choose **Reading toolbar**, read the current note, pause, resume, stop and close the toolbar.
- [Selected text](../images/mobile-selection-demo.gif), about 29 seconds: open the toolbar, slowly select a passage, expand the player, choose **Read selection**, return with **Back to document** while playback continues, and close the reader.
- [Document outline](../images/mobile-outline-demo.gif), about 30 seconds: open the outline, tap a heading to locate it below the toolbar, reopen the outline, select a reading range and choose **Read section**.

All three GIFs are silent, looping, 440 × 876 pixels at 10 frames per second. The main README displays them at 340 pixels wide. Open any image to view its full resolution.

## Recording Scope

Recorded on October 29, 2026 with **Cozy Read Aloud Mobile 0.4.0** in **Obsidian 1.14.4 on Windows**, using Obsidian's built-in mobile-layout emulation at a 440 × 820 viewport. This is the plugin's actual interface in an isolated public sample vault, not a reconstructed interface or an iPhone/iPad screen recording.

The outline clip was recorded later in Obsidian **1.14.5**, with the local outline-positioning fix applied to 0.4.0. The fix uses the heading's source position and the rendered viewport to keep it below the toolbar; this clip is not evidence that the fix is already in the published 0.4.0 release.

The outline fix ships in 0.4.1. That release also adds a highlighter button and adjusts narrow layouts; these earlier recordings do not show the new button.

Playback uses a locally exposed Windows system voice. The recorded plugin controls and speech events are real: pause/resume state was checked, selection reading was verified against the selected paragraph, and returning to the note was checked not to stop playback. No online speech requests, account credentials or replay adapters are used. System speech does not support seeking through an audio file, so its audio timeline remains unavailable in these clips.

The full action menu is shown before a choice is made. A small, fading pale-yellow circle marks pointer-down. Short English captions sit outside the captured app viewport; neither captions nor click cues are part of the plugin. The GIFs preserve the recorded operation timing, sampled at 10 frames per second. They are not synthesis-latency benchmarks.

Mouse selection in the emulator does not demonstrate iOS/Android native selection handles. Device layouts, selection gestures, voice availability, background playback and lock-screen behavior still need device testing. These clips do not show PDF parsing, audio export or background playback. The outline clip demonstrates Markdown, not PDF or HTML navigation.

## Public Sample

The note is titled **A moment to listen** and contains only this invented text:

### Start with a passage

Select a passage and let your notes speak. Keep the original page nearby as you listen. Pause whenever you need a moment to think.

### Keep your place

Use the document outline to jump to a section. Read just that section, or continue from there. The choice is yours.

### Make room to read

The compact toolbar stays beside your document. Open the full player for more controls, then return to your note.

### A quiet moment

Choose a comfortable voice and a pace that suits you. Stop when you are finished, and come back whenever you are ready.

## Privacy

Only the three final GIFs and this description belong in the repository. Private notes, PDFs, account settings, keys, recording profiles and raw frames are not included. The sample vault is separate from the user's working vault.

## 中文说明

三段动图分别展示基本播放控制、选区朗读、大纲跳转与章节朗读，均使用独立的虚构公开示例库，在 Windows 版 Obsidian 的移动布局模拟中录制，并非 iPhone/iPad 真机实录。使用实际插件控件和本机系统语音，没有调用在线接口、读取账号密钥或用预录音频替代播放；动图本身无声。

大纲演示使用 Obsidian 1.14.5 和加入本次定位修复的本地构建，目标标题会在工具栏下方显示；不表示已发布的 0.4.0 已含此修复。这段仅演示 Markdown 大纲，不代表 PDF 或 HTML 的定位效果。

大纲定位修复随 0.4.1 发布。该版还新增荧光笔按钮并调整窄屏布局，上述较早录制的动图尚未展示新按钮。

淡黄色点击提示及画面上方的英文字幕仅用于演示。模拟环境使用鼠标选区，不代表手机原生长按选区手势，也不能作为后台播放、锁屏连续播放或在线合成速度的验收依据。仓库仅包含最终动图与说明，不包含私人正文、录制配置或原始帧。
