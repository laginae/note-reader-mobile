# Note and PDF Voice Reader for Mobile

Listen to Markdown notes, text-based PDFs and local HTML files without leaving your mobile reading workflow. Use device system voices, or opt in to Xiaomi MiMo, Azure Speech, OpenRouter, remote CosyVoice or a custom speech API.

## Reading on a phone or tablet

The compact document toolbar provides pause/resume, Stop, previous/next chunk, playback speed and seeking within loaded online audio. Start with the full file, selected text, a selected position or a saved reading position. Expand the player for additional controls and audio export.

## Document outlines and sentence-first reading

Navigate Markdown headings, HTML h1-h6 headings and PDF bookmarks or inferred headings. Clicking a title locates the source without starting speech; the adjacent range button selects Read section or Read from section. Section reading includes child headings. PDF navigation falls back to the corresponding page with a notice when exact positioning is unavailable. Local HTML navigation requires HTML Reader.

Complete sentences are moved to the next audio chunk instead of split to fill the current one. Sentences that exceed the provider cap still require clause/word splitting; MiMo keeps a 200-character safety cap. Cross-page PDF sentence continuations are joined conservatively.

## Academic PDF tools

- Coordinate-aware single- and two-column reading order.
- Default-on, optional filtering of recurring headers, footers and page numbers.
- Conservative footnote separation: read the body, keep original order or read identified notes separately.
- PDF bookmarks first, inferred numbered/font-emphasized headings as a fallback. Search the outline, read a section with its subsections or continue from that section.
- Reuse an in-memory outline cache; refresh when needed. The original PDF is not modified.

PDF extraction is heuristic. Scanned files require OCR, and complex layouts may need a selected reading range or filtering disabled. This edition does not yet highlight the spoken text or write PDF bookmarks.

## HTML and exported audio

Install **HTML Reader** to browse local HTML/HTM files in the vault. Full-file reading parses saved HTML locally without executing scripts or fetching page resources. Selection reading uses accessible rendered HTML Reader content. External webpages are not included.

Online engines can export a confirmed reading range as normal-speed mono WAV into `Note Reader Audio/`. Export makes new synthesis requests and may incur charges. It is limited to 30,000 characters and 32 MiB output. Device system speech cannot be exported. Exported audio contains document content and may be copied by vault sync.

## Privacy

No developer relay server or built-in telemetry. Online speech is opt-in and sent directly to the chosen service. Keys use Obsidian SecretStorage. Device speech may depend on the OS voice's own online/offline behavior. Provider retention/training rules remain separate; OpenRouter requests require ZDR and deny data collection. Parsing PDF/HTML and identifying outlines/footnotes happen locally.

## Testing and feedback

An iPhone user has confirmed full-file reading, starting from selected text, pause/resume, Stop, speed adjustment and a toolbar no longer obscured in their setup. New outline, footnote, HTML and export features, as well as iPad/Android and complex PDF layouts, still need broader real-device validation.

Please report issues at [GitHub Issues](https://github.com/laginae/note-reader-mobile/issues). Include versions, speech engine, reading scope and reproduction steps. For PDF issues, screenshots of the reader and the corresponding PDF region help locate the problem. Redact private content; share a minimal PDF only when permitted. Never include API keys or `data.json`.

[中文说明](https://github.com/laginae/note-reader-mobile/blob/main/README.zh-CN.md) · [Source and releases](https://github.com/laginae/note-reader-mobile)
