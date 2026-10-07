# Mobile Device Validation

Version: 0.3.0. Status: **basic iPhone workflow confirmed by a user; new features and broader device coverage pending**. On 2026-10-07, the user explicitly confirmed full-file reading, starting from selected text, pause/resume, Stop, speed adjustment and a toolbar no longer obscured in their iPhone setup. Exact device/OS versions were not provided. This is user-reported validation of the prior basic workflow, not a claim that all 0.3.0 additions passed device tests.

Initial iOS feedback identified panel-exit and selection problems in 0.2.0, bottom-navigation overlap in 0.2.1, and status/header overlap in 0.2.2. Complex PDFs may still have issues. iPad, Android, other themes and the new outline/footnote/HTML/export workflows remain pending.

Use a public sample note/PDF and a dedicated test key with a small spending cap. Record OS, Obsidian, WebView versions and date. Do not attach keys, private files or device identifiers to issues.

## Required on Both Platforms

- Install release files; enable/disable/restart without exceptions.
- Check portrait/landscape, touch controls, settings tabs and readable labels.
- Check the reading bar below the title and above the document, with the iOS floating navigation visible and the keyboard open/closed. Test portrait and landscape; all controls and the final document lines must remain reachable.
- On iPhone, check the status bar, native title buttons and reader never overlap, including auto-hidden navigation. Close the reader and check that native floating navigation is restored.
- On iPad, test portrait/landscape, wide panes, Split View, Stage Manager and hardware/software keyboards. A wide screen with a narrow pane must use the narrow layout, without extra phone status padding.
- Expand the player, return to the document without interrupting playback, and close it to stop playback completely.
- Tap the square Stop button during playback, synthesis and PDF extraction. The session must stop without closing the bar; select a different scope and restart. Already-sent provider work may still be billed.
- Select text before changing the reading scope or expanding the panel; verify the exact starting position in Markdown preview/editing and PDF views. Switch files or edit the source and confirm old selections are not reused.
- Check system voice availability and whether the chosen voice works offline. An unavailable voice must not start an online engine automatically.
- Read selection, continue from selection, full note and single-/two-column PDFs.
- On a public multi-page PDF, compare full reading with Academic > Skip PDF headers and footers on/off. Repeated author/journal edge lines and page numbers should be skipped when enabled; body, titles and footnotes must not be inadvertently removed. Verify both columns and alternating headers.
- Continue from a body selection and resume on the last page with filtering enabled. Only the selected/resumed page onward should play. Selection-only reading must preserve selected edge text. Change the setting during playback: current playback stays intact and the next session uses the new value.
- Check unique headers, rotated pages and unusual margins; conservative retention is expected. Disabling the setting should restore all extracted edge text. The PDF file itself must remain unchanged.
- Test previous/next, repeated taps, pause during synthesis and playback.
- Test 0/50/100% volume, 1/1.25/2x speed across segment changes and current-audio seeking.
- Test background, lock screen, interruptions and foreground return; no automatic new synthesis while hidden.
- Enable resume records, restart, resume and then modify a file to check recovery limitations.
- Confirm each online engine refuses requests without consent and does not prefetch future chunks.
- Send one short public sentence to each intended engine. Check end-of-sentence completeness and audio decoding.
- Verify HTTPS/CORS failures do not cause insecure fallback. A provider preset does not prove mobile WebView compatibility.
- Revoke consent/change engine/model/endpoint during a pending response; old audio must not start.
- Test quota/auth/network/timeout failures; no automatic retry or raw response/credential disclosure.
- Test incomplete MiMo generation; no silent skip.
- Open a PDF outline with bookmarks and without bookmarks. Search, read a parent/child section, continue from a section and close during scanning. Reopen unchanged files without rescanning; modify the file and confirm invalidation.
- Compare body-only, original-order and footnotes-only reading on single-/two-column papers and a first-page author block. Include same-size numbered body paragraphs and small tables to check false positives.
- Install HTML Reader, open a local HTML/HTM file and check full-file, selected text, exact selected position and resume. Include duplicate sentences, iframe reload and changing files. Confirm an inaccessible frame fails safely.
- Confirm an online export for a short public range. Check WAV playback, normal speed, filename collision handling and vault sync expectations. Close during synthesis and confirm no later chunks are requested. Test provider failure, consent change, unsupported decoding and size limits; do not use paid accounts without an explicit spending decision.

## Release Gate

Only mark scenarios passed after device observation or an explicit, attributed user report. Automated checks do not satisfy device tests. Keep early GitHub releases marked as prereleases; the user has requested community submission with the limited validation status disclosed. Community acceptance is a separate review outcome, not proof of complete device coverage.
