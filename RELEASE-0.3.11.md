# Cozy Read Aloud Mobile 0.3.11

## PDF Formula Repair

- Backport the desktop 1.2.6 math-font encoding repair to the mobile PDF pipeline, with mobile-compatible regular expressions and no desktop-only APIs.
- Use a multi-script signature within a font to recover known operators. Preserve normal multilingual text; omit uncertain mathematical symbols instead of guessing.
- In smart mode, group complex displayed equations, limits and equation numbers into a formula notice. Keep supported short expressions readable.
- Apply the same corrections to full-file, outline-section and selected-text reading when Strip Markdown is enabled. Selection processing stays local and does not expand the selected range; uncertain matches request reselection.
- Keep original text coordinates and outline metadata. Respect header/footer, footnote, formula-mode and omission-notice settings; invalidate cached outlines when formula settings change.

## Validation and Privacy

- Automated tests cover font evidence, short expressions, language preservation, selection boundaries, cross-page context, cancellation, stale sources and mobile runtime restrictions.
- Actual iPhone/iPad/Android testing of this update is still pending. This is a mobile backport, not a new mobile PDF context-menu feature.
- No private PDFs, manuscript text, credentials or local diagnostic extracts are included. No online speech requests were made for these tests.
- Release assets are independently rebuilt, checked and attested by GitHub Actions.
