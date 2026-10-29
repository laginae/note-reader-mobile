# 0.4.2

- Harden pause/resume and operating-system interruption handling. Late playback promises and events cannot restart an obsolete or paused reading session.
- Fix PDF reading from a selection: locate the exact original-source suffix, including cross-page anchors. Ambiguous/missing anchors request reselection instead of reading an unintended page.
- Align the shared core and public PDF regression corpus. Full-file and selected-text paths are tested against the same invented examples.
- Add a detailed device test checklist, public sample note and privacy-safe issue template.

**Experimental background playback remains off by default. Physical iPhone, iPad and Android tests for this build are deferred, not passed.** OS suspension and interruptions can pause audio; return to the foreground and resume manually. Earlier user feedback and Windows/browser simulations do not establish current-device compatibility.

No private documents, personal text, API keys or captured provider responses are included. This release uses automated/public-fixture checks; it adds no new paid account test.
