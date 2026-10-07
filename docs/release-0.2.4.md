# 0.2.4 - Dedicated Toolbar Stop Button

- Add an independent square Stop button beside Play/Pause in the compact toolbar.
- Stop ends the session, releases current audio and invalidates pending synthesis/extraction results while keeping the toolbar and source view open.
- Keep Close as the separate stop-and-dismiss action; reset reading-scope controls after Stop.
- Adjust narrow/wide toolbar grids for the added touch control.
- Clarify an existing limitation: mobile PDF reading has column ordering but no dedicated header/footer filtering or footnote separation. This release does not change PDF extraction.

Validation: 60 automated tests, production build, mobile API boundary and privacy checks pass. iPhone/iPad touch and layout retesting remains pending. No paid speech requests were made. Stopping cannot cancel charges for work already sent to a provider.

Use BRAT repository `laginae/note-reader-mobile`, release tag `0.2.4`, then reload the plugin. This remains a testing prerelease, not a community-directory submission. Desktop and shared-core repositories are unchanged.
