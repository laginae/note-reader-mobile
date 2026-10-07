# 0.2.5 - PDF Header and Footer Filtering

- Add default-on "Skip PDF headers and footers" under Academic settings, with Chinese and English labels.
- Locally filter repeated short author/journal edge lines and recognizable page numbers while preserving PDF column order. Keep uncertain text, larger titles and numbered headings; the PDF file is never modified.
- Apply filtering to full-PDF reading, continuing from a selection and resuming. Use at most three preceding pages as evidence when starting partway through a document, without reading those pages aloud.
- Preserve selection-only reading and explicitly chosen starting anchors. Setting changes apply to the next session without interrupting current playback.
- Include the dedicated toolbar Stop button from 0.2.4 and update both READMEs and the device checklist.

Filtering is heuristic, not guaranteed for every layout. Unique headers, rotated pages and unusual margins may remain. Disable the setting if body text is omitted. Footnote separation is not included.

Validation: 76 automated tests, production build, mobile API boundary and privacy checks pass. iPhone/iPad and Android device validation remains pending. Tests use synthetic public text and make no paid speech requests. Desktop and shared-core repositories are unchanged.

Use BRAT repository `laginae/note-reader-mobile`, release tag `0.2.5`, then reload the plugin. This remains a testing prerelease, not a community-directory submission.
