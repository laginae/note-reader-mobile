# Cozy Read Aloud Mobile 0.7.1

- Synchronize concise formula labels with the desktop edition: hat/widehat, tilde/widetilde, bar, dot/double dot, prime/double prime, superscript star, explicit transpose and short vector names.
- Read `\widehat{q}_t` as "q hat t" and `\bar{x}_{i,j}` as "x bar i j", retaining index order and fraction grouping. Chinese formula speech uses Chinese vector/transpose labels. Do not infer estimates, derivatives or optimality; ordinary `A^T` remains a power.
- Preserve verbose structural speech, explicit formula skipping and existing smart-mode complexity limits. No broadening of matrix, long fraction, nested expression or function-ratio reading.
- Apply the shared rules to Markdown, local HTML and recognized PDF formulas. Reliable PDF prime glyphs and positioned star/transpose superscripts retain their original source data; arbitrary accent layouts are not reconstructed.

Automated tests use synthetic documents and public formulas only. iPhone, iPad and Android real-device validation remains pending. Mobile background playback, optional OCR and OpenAI Realtime remain experimental with their existing opt-in requirements; this release does not change their validation status.

No private text, PDFs, settings or credentials are distributed. Changes apply to newly prepared reading audio, not audio already synthesized.
