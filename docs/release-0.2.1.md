# 0.2.1 - Mobile Toolbar and Selection Fixes

This is a testing prerelease. The new controls address initial iOS feedback; full iOS and Android device validation remains pending.

- Open a compact bottom reading bar from the reader icon without leaving the current note or PDF.
- Choose the reading scope and control play/pause, previous/next chunk, playback speed and the loaded audio position beside the document.
- Expand the full player when needed. Its back arrow returns to the document without stopping playback; Close stops playback and dismisses the reader.
- Preserve the source selection before panel focus changes, including Markdown cursor position and PDF selected text/page. Reject cached selections from another file or a modified source.
- Keep controls stable during playback updates and disable audio seeking for system speech.
- Update English/Chinese instructions and the device validation checklist.

Validation: 53 automated tests, production build and mobile API boundary checks pass. No paid speech requests or private notes were used. Desktop and shared-core repositories are unchanged.

## Install for Testing

Use BRAT with repository `laginae/note-reader-mobile` and release tag `0.2.1`. If previously pinned to `0.2.0`, change the selected version; checking for updates to a frozen version alone will not upgrade it.

Alternatively install the attached `main.js`, `manifest.json` and `styles.css` in the existing mobile plugin folder, preserving settings, then reload the plugin. This release is not a submission to the Obsidian community directory.
