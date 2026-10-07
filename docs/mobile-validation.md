# Mobile Device Validation

Version: 0.2.2. Status: **full Android and iOS device validation pending**. Initial iOS feedback identified panel-exit and selection problems in 0.2.0 and floating-navigation overlap in 0.2.1. The updated controls still need device retesting.

Use a public sample note/PDF and a dedicated test key with a small spending cap. Record OS, Obsidian, WebView versions and date. Do not attach keys, private files or device identifiers to issues.

## Required on Both Platforms

- Install release files; enable/disable/restart without exceptions.
- Check portrait/landscape, touch controls, settings tabs and readable labels.
- Check the reading bar below the title and above the document, with the iOS floating navigation visible and the keyboard open/closed. Test portrait and landscape; all controls and the final document lines must remain reachable.
- Expand the player, return to the document without interrupting playback, and close it to stop playback completely.
- Select text before changing the reading scope or expanding the panel; verify the exact starting position in Markdown preview/editing and PDF views. Switch files or edit the source and confirm old selections are not reused.
- Check system voice availability and whether the chosen voice works offline. An unavailable voice must not start an online engine automatically.
- Read selection, continue from selection, full note and single-/two-column PDFs.
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

## Release Gate

Only mark scenarios passed after device observation. Automated checks do not satisfy device tests. Until complete, keep GitHub releases marked as testing prereleases and do not claim community-directory readiness.
