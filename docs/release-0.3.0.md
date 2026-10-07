# 0.3.0 - Mobile PDF Sections, HTML and Audio Export

Public name: **Note and PDF Voice Reader for Mobile**. Plugin ID remains `note-reader-mobile`; existing settings and installation paths are unchanged.

- Add a searchable, dismissible PDF outline panel: use built-in bookmarks first, otherwise infer headings and preserve numbering. Read a section (including children) or continue to the end.
- Cache one PDF outline in memory, invalidate when the source/header setting changes, and provide manual refresh. Do not write back to PDFs.
- Add conservative footnote separation, including two-column page-bottom notes and first-page correspondence blocks. Default to body-only, with original-order and footnotes-only options; add a toolbar footnote scope.
- Add local HTML/HTM reading with HTML Reader, including selected text, exact rendered selected position, full file and resume. Source parsing never executes scripts or downloads page resources.
- Export an online-engine reading range to mono 16-bit WAV after explicit confirmation. Save under `Note Reader Audio/` without overwriting; allow cancellation and enforce 30,000-character/32-MiB limits. Export makes new requests and may incur charges; system speech export is unavailable.
- Update English/Chinese documentation, community description, privacy/feedback guidance and device checklist.

Validation: automated regression tests, production build, mobile API boundary and public-file privacy checks. No paid speech requests or private documents were used in automated tests. GitHub checks and asset hashes are verified during publication.

The user confirmed the prior basic iPhone workflow: full-file reading, selected-position reading, pause/resume, Stop, speed and an unobstructed toolbar. This is not a claim that the new features or every PDF/iPad/Android combination have passed device tests. Report reproducible PDF issues with redacted reader/PDF screenshots; share files only when permitted.

This is an early mobile prerelease prepared for the user-requested community submission. Community listing/review status is independent of this GitHub release. Desktop and shared-core repositories are unchanged.
