# 0.3.8

- Simplify setup into System speech, Online speech and Self-hosted service, preserving existing provider settings.
- Add a fixed-sample voice test with Stop test and bounded error guidance. It does not read notes or interrupt reading/export; online tests may incur charges.
- Collapse advanced options and improve narrow-screen settings layout.
- Remove duplicate dividers at the top of engine and academic settings.
- Add Read aloud from here and Read selected text to Obsidian's Markdown editor context menu. Availability on mobile depends on Obsidian exposing that menu; this does not replace the native selection popup. PDF, HTML and reading views retain toolbar actions.

- Independently toggle editor menus and the optional Editing Toolbar speaker in Playback settings. Choose selected text (default) or selection-to-end. Changing these preferences does not stop playback.

Validation: 149 tests and mobile compatibility checks passed. Shared desktop/mobile settings passed 24 browser layout checks. These changes have not yet been verified on a physical iPhone or iPad.
