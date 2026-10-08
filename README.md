# Note and PDF Voice Reader for Mobile

[English](README.md) | [简体中文](README.zh-CN.md)

A mobile-first read-aloud companion for Markdown notes, text-based PDFs and local HTML files in Obsidian.

**0.3.1 is an early mobile release.** An iPhone user has confirmed full-file reading, starting from selected text, pause/resume, Stop, speed adjustment and an unobstructed toolbar in their tested setup. The new outline, footnote, HTML and export workflows still need broader device testing. Complex PDFs may have layout-specific issues. This is a separate plugin and does not change the desktop edition.

## Highlights

- **Read beside your document:** touch-sized controls with pause, Stop, speed and current-audio seeking.
- **Editor menu:** Markdown Live Preview/Source context menus offer Read aloud from here and Read selected text. Mobile availability depends on Obsidian exposing its editor menu; the system selection popup is not replaced. Existing toolbar actions remain available for PDF, HTML and reading views.
- **Academic PDF reading:** column-aware text ordering, optional header/footer filtering, and conservative footnote separation, including first-page correspondence blocks.
- **Document outlines:** navigate Markdown headings, HTML h1-h6 headings and PDF bookmarks/inferred headings. Clicking a title locates the source without starting speech. The adjacent range button selects a section for Read section or Read from section.
- **Sentence-first chunks:** move a complete sentence to the next chunk when it cannot fit; split only oversized sentences at clause/word boundaries within the provider cap. Conservatively join PDF cross-page continuations.
- **Local HTML:** open files with HTML Reader, then read the whole file, a selection or from a selected position.
- **WAV export:** save an online-engine reading range to the vault after explicit confirmation.
- **Privacy choices:** device speech by default; optional online providers require permission. No developer relay server or built-in telemetry.

## Install and Start

Playback settings offer independent switches for the editor reading menu and the optional Editing Toolbar speaker icon. The icon defaults to selected text, with an option to read from the selection to the document end. It requires a selection and an enabled Editing Toolbar plugin.

Settings separate **Reading method** (System speech / Online speech / Self-hosted service) from the online provider. Existing configurations are preserved. Configure the secret and voice, review the processing permission, then use **Test voice** for a fixed sample that never reads your notes. Online tests may incur charges. **Stop test** cancels the test; it does not replace an ongoing reading or export. Self-hosted speech uses your HTTPS endpoint, not a model running on the phone. Advanced chunk and prefetch controls are collapsed in Playback settings.

1. Use Obsidian 1.11.4 or later and back up your vault.
2. Open **Settings → Community plugins → Browse** and search for **Note and PDF Voice Reader for Mobile**.
3. Select **Install**, then **Enable**. You can also open the [community listing](https://community.obsidian.md/plugins/note-reader-mobile).
4. Open a note or PDF and tap the reader icon to show the playback toolbar.
5. Start with device system speech, or choose an online engine in the plugin settings and explicitly enable processing after configuring its secret.

To browse and read local HTML files, install and enable **HTML Reader** as well. Avoid starting the desktop and mobile reader plugins at the same time in one vault.

## Current capabilities

### Phone controls

The reader icon and `Show reading toolbar` command open a compact bar above the current note or PDF, below its title bar, without switching to a separate tab. The controls reserve their own space outside the document scroll area to avoid iOS floating bottom navigation. Select a reading scope and press Play. Pause/resume, previous/next chunk, current-audio seeking and playback speed are available beside the document. Seeking only applies to loaded online audio, not system speech.

The square Stop button ends reading or cancels PDF extraction while keeping the bar open. Expand opens the full player. Its back arrow returns to the document without stopping playback; Close stops and hides the reader. Select text and choose Continue from selection to start there. The source selection is retained in memory before opening the panel, not written to settings; select it again after editing the document. Stopping cannot undo a speech request already sent to a provider or its charges.

On phones, opening the reading bar temporarily keeps the current pane's native title controls in normal layout below the status-bar safe area; closing the bar restores the original layout. On iPad, the bar uses a single row in wide panes and stacked rows in narrow Split View or Stage Manager windows. It does not apply phone-specific status padding to tablet panes. iOS/Android device verification is still needed, particularly for rotation, keyboards, native selection menus and PDF views.

- Read selected note or PDF text
- Continue reading from a selected position
- Read an entire active note or text-based PDF
- Resume from a privacy-bounded saved position
- Coordinate-aware single-column, two-column, and mixed-layout PDF ordering
- Optional local PDF header/footer filtering, enabled by default
- PDF bookmarks or an inferred outline, section reading and a one-document in-memory outline cache
- Body-only, original-order or footnotes-only PDF reading
- Local HTML reading and confirmed WAV export for online speech engines
- Device system speech with no text sent by the plugin to an online TTS service
- Optional Xiaomi MiMo, Microsoft Azure Speech, OpenRouter TTS, HTTPS remote CosyVoice and a custom speech API (BYOK)
- Touch-sized controls, vertical layouts, pause/resume, and chunk navigation
- Online synthesis is on demand by default; optional one-part lookahead reduces gaps
- Local online-audio playback speed, volume and seeking within the currently loaded audio
- Categorized settings, academic text handling and progressive opening audio within logical chunks

## Online Setup

**Price references:** OpenRouter settings show dated prices for verified ElevenLabs and MAI presets, character-based cost estimates and an official-pricing link. These are offline snapshots, not live quotes. The recorded ElevenLabs offer ends on October 19, 2026 at 15:00 UTC; settings opened afterward show only the last checked list price and a reminder to verify it. Other models show no numeric estimate. Repeat synthesis, fees and taxes can increase the final cost.

**ElevenLabs via OpenRouter:** choose Multilingual v2, Flash v2.5, Eleven v4 or v4 Turbo, with George, Sarah, Daniel, Alice, Brian or Lily. Existing defaults are unchanged. Audio uses MP3 at normal synthesis speed; adjust playback speed in the player. ZDR and denial of data collection remain mandatory; an unavailable route fails without relaxing privacy. The [speech catalog](https://openrouter.ai/api/v1/models?output_modalities=speech) and [ZDR endpoint list](https://openrouter.ai/api/v1/endpoints/zdr) were checked on 2026-10-08. Prices and availability can change.

**Optional continuity:** these four models show an ElevenLabs advanced section with an experimental, default-off continuity toggle. It sends only neighboring sentences within the current reading range, up to 160 characters per side, through `provider.options.elevenlabs`; it never reads outside a selected range or uses request history. Other models hide the option and receive no context parameters, while the saved preference is retained. No cloud pronunciation dictionary or automatic performance tags are added. Source audio tags may affect delivery. Parameter support follows the [OpenRouter announcement](https://openrouter.ai/blog/announcements/elevenlabs-on-openrouter/); paid listening tests have not been performed, so improved sound is not guaranteed.

**Local term pronunciations:** in Academic settings, enable rules such as `AI = artificial intelligence`, one per line. Rules are case-sensitive literal matches (not regex), longest match first, without recursive replacement. Up to 100 rules are stored locally; each term is limited to 80 characters and each pronunciation to 120. Online engines receive the substituted speech text, not the rule list. Source documents and original reading positions are preserved; expanded requests are split to respect engine limits. These rules also apply to export. Rules take effect next session; edited rules do not change already-prepared audio.

**Xiaomi MiMo:** create a key in the [MiMo console](https://platform.xiaomimimo.com/), select its Obsidian secret, and enable processing. The default voice is **白桦 (Baihua)**, which can be tried with Chinese and English text. MiMo uses conservative 200-character chunks and rejects incomplete generation instead of silently advancing. This is a client-side limit, not an advertised provider maximum. Pricing/promotions may change; no permanent free-service guarantee is made. See the [official synthesis guide](https://mimo.mi.com/docs/en-US/quick-start/usage-guide/audio/speech-synthesis-v2.5).

**OpenRouter:** choose a secret, model and voice, then enable processing. **Azure:** also set the Speech resource region and cloud. Check your resource/provider privacy and retention settings; the plugin does not certify a service as no-training or ZDR merely because a key is configured.

**BYOK:** one active configuration supports OpenAI-compatible speech, ElevenLabs or MiniMax. Fill in the endpoint, model, voice ID and secret reference, then explicitly confirm transmission, billing, training and retention risks. Changing the endpoint/provider clears the secret reference and consent without deleting the stored secret. Model, voice and secret-reference changes require renewed consent. Chat-only endpoints are not speech endpoints.

Custom BYOK and remote CosyVoice requests use HTTPS, reject redirects, omit cookies and have no unsafe fallback. The service must allow requests from the mobile WebView (CORS); some endpoints may be unavailable. Test your actual device and endpoint. An authorization checkbox is not a provider privacy guarantee, and revocation cannot recall already-sent text.

Voice/API references: [OpenAI speech](https://developers.openai.com/api/docs/guides/text-to-speech), [ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [MiniMax](https://platform.minimax.io/docs/api-reference/speech-t2a-http).

## Privacy

The default engine is device system speech. The plugin itself makes no TTS network request in that mode; the OS and voice implementation determine whether their speech processing is offline. Prefer voices identified as local when privacy matters. Installed voices may not be exposed to the mobile WebView.

All online engines are opt-in. Only current audio text is sent after consent. API keys are read from Obsidian SecretStorage; only secret names are saved in `data.json`. OpenRouter requests require `provider.zdr: true` and `provider.data_collection: "deny"`; unavailable routes fail rather than silently weakening those flags.

The plugin has no developer relay server or built-in telemetry. Playback audio is held in memory; settings and optional resume records stay in the vault and may be synchronized by your chosen sync service. OS, Obsidian and provider policies are separate. Stopping/timing out cannot undo processing or billing already begun. Failed requests are not automatically retried, and raw provider error bodies are not displayed.

OpenRouter defaults to Kokoro `bm_george` (UK English male); presets also include US English voices. Microsoft compatibility voice IDs may be rejected by a route even when accepted elsewhere. Models, voices, account access and prices remain provider-dependent.

PDF parsing and reading-order calculation happen locally. Image-only PDFs require OCR before they can be read.

## PDF Sections and Footnotes

On Markdown, local HTML or PDF files, tap the outline icon or choose Document outline in the expanded player. Tap a title to locate the source and close the outline without changing playback. The adjacent range icon selects a section for Read section or Read from section. Section reading includes its subsections and stops before the next same-level or higher-level heading. HTML uses h1-h6 headings and needs HTML Reader for navigation. PDF bookmarks take priority over inference; unsupported exact navigation falls back to the page with a notice. Unresolved HTML navigation keeps the panel open rather than guessing a location.

Reopening the same unchanged PDF uses a single-document memory cache. Refresh explicitly rescans it; file changes or header-filter changes invalidate it. The cache is not written to settings and is cleared on plugin unload. Nothing is written back to the PDF.

Academic > PDF footnote reading defaults to Body only. Smaller bottom-page text with a marker and a separating gap may be identified as a note; uncertain text stays in the body. Choose Original order to retain notes, or Footnotes only to read them separately. The toolbar scope menu also offers Read PDF footnotes only without changing the setting. Selection-only reading preserves the selected text. Notes are separated by page layout, not linked semantically to individual citations.

## Local HTML

Install and enable the **HTML Reader** community plugin to open `.html` or `.htm` files in the vault. Full-file reading parses the saved HTML locally, without executing scripts or loading page resources. For an accessible HTML Reader frame, selected-text and selected-position reading use the actual rendered selection. A reloaded frame or changed file may require selecting again. Script-generated content that is absent from the saved file is not included in full-file reading; external webpages and HTML highlighting are not included.

## Audio Export

Start a reading range with an online engine, expand the player and choose Export reading audio (also available as a command). Confirm the displayed chunk/character count. Export synthesizes that entire range again, not just the remaining audio, so it may incur additional provider charges. Playback is paused; existing service consent still applies.

The result is a normal-speed, mono, 16-bit WAV under `Note Reader Audio/` in the vault. Player speed and volume are not baked into it. No desktop executable is required, no files are overwritten, and exported content may be synchronized by your vault sync service. Close the export window to cancel future requests; already-sent requests and an already-started file write cannot be recalled. System speech cannot be exported. Mobile limits are 30,000 characters and 32 MiB output; choose a shorter selection or section if needed. Oversized/failed synthesis produces no completed export, but requests already sent may still be billed.

## Remote CosyVoice contract

The configured endpoint must use HTTPS and accept a JSON request:

```json
{
  "input": "Text to synthesize",
  "voice": "optional voice name",
  "speed": 1,
  "response_format": "mp3"
}
```

It must return MP3 or WAV bytes. If a remote secret is selected, it is sent as an `Authorization: Bearer` header.

## Playback and Limits

**Session audio and continuity:** already prepared audio is reused within the same reading session (up to 64 parts / 16 MiB of cached audio bytes, excluding active responses and playback). In Playback settings, **Prepare the next audio part** is off by default. Enabling it permits one upcoming part to be synthesized alongside the current one, with at most two synthesis operations in flight. Future text may be sent and billed even if you never listen to it. Rapid jumps prioritize the latest queued target; sent requests cannot necessarily be cancelled and may still delay it. Pause prevents new queued work. Stop, changing documents or changing the voice/provider clears reusable session audio; exports and saved positions are untouched. Privacy settings also provide **Clear session audio**. No persistent audio cache is added.

**Waiting-time diagnostics:** run **Copy playback waiting-time summary** to copy bounded numeric statistics from this plugin session. Nothing is uploaded or written to disk automatically; the report contains no text, paths, voices or keys. It measures preparation, queueing, foreground waiting and the browser's playback-start event, not physical speaker output. `sessionToPlaying` starts when the reading queue is ready, not at the original click; extraction, when measured, is separate. Paused time is excluded from jump/gap intent measurements. First-time synthesis and slow providers still require waiting. Developers can run `npm run benchmark:playback` for a network-free synthetic comparison, not a real-provider speed claim.

Simple formulas such as `$z_{\mathrm d}$` are read as "z sub d". Font and spacing commands do not make a short formula complex; explicit skip settings and complex-formula safeguards still apply.

Conventional bounds such as `[\ell,u]` and matching `E_{\min}` / `E_{\max}` endpoints use concise "to" phrasing; verbose mode retains "closed interval". Other bracketed pairs keep their brackets. Simply subscripted adjacent factors are separated by "times".

**PDF headers and footers:** Settings > Academic > Skip PDF headers and footers is on by default. It locally removes short repeated edge lines (such as authors and journal names) and recognizable page numbers, without modifying the PDF. It applies to full-PDF reading, continuing from a selection and resuming; selection-only reading keeps the selected text. Changes take effect on the next reading session.

Filtering is conservative: uncertain edge text, larger titles and numbered headings are retained. When starting partway through a PDF, up to three preceding pages provide local recognition evidence but are not read aloud. Unique headers, unusual margins, rotated pages or missing text coordinates may remain unfiltered; disable the setting if body text is omitted.

| Capability | Mobile 0.3.1 | Desktop 0.9.4 |
| --- | --- | --- |
| Markdown and text PDFs | Supported; device testing pending | Supported |
| MiMo and custom speech APIs | Added; device/provider checks pending | Available |
| Local executable / Python engines | Not included | Available |
| Academic text cleanup | Shared-core opt-in algorithms | Available |
| PDF header/footer filtering | Default-on local heuristic; can be disabled | Available |
| PDF outline and footnote separation | Added; broader device testing pending | Available |
| Local HTML and audio export | HTML Reader integration; WAV export from online engines | Available |
| Highlights, PDF bookmark writing, Web viewer, Copilot | Not included | Available |

- Online synthesis uses normal speed; playback rate is applied locally, avoiding doubled speed or a new paid synthesis merely to change speed. System speech rate/volume changes may apply at the next utterance.
- The five-second buttons and current-audio slider only seek within the loaded online audio, not future chunks or system speech.
- PDF extraction finishes before playback; this is not the desktop progressive-PDF implementation. Image-only PDFs need OCR.
- Highlighting, PDF bookmark editing and Web viewer/Copilot integration are not included in this release.
- Reading-order and resume anchors are heuristic. Complex PDFs and changed files may need a new selected starting point.
- Background/lock-screen playback is not guaranteed. The plugin pauses when the app is hidden.
- If the device blocks autoplay, tap Resume to play the retained audio; this does not request another synthesis.

## Manual Installation

Use this alternative when the community directory is unavailable or you need a specific version.

1. Download `main.js`, `manifest.json` and `styles.css` from the same version in [GitHub Releases](https://github.com/laginae/note-reader-mobile/releases).
2. Put the three files in `<vault>/.obsidian/plugins/note-reader-mobile/` using your device file manager or vault sync.
3. Enable the plugin in Community plugins. If updating an enabled plugin manually, disable and re-enable it to load the new files.

Do not copy another vault's `data.json` or credentials. Community approval does not replace testing on your device or with your documents.

## Development

```bash
npm ci
npm test
```

This repository consumes [`@laginae/note-reader-core`](https://github.com/laginae/note-reader-core). It contains no Node.js, Electron, filesystem, child-process, or local executable calls.

See the [device checklist](docs/mobile-validation.md) for confirmed and pending coverage. Mocked tests do not send notes or charge speech accounts. The source entry point is included so the release bundle can be rebuilt from this repository.

## Feedback

Report problems in [GitHub Issues](https://github.com/laginae/note-reader-mobile/issues), including plugin/Obsidian/iOS or Android versions, speech engine, steps to reproduce and the relevant reading scope. For PDF issues, screenshots of the reader and the corresponding PDF region are particularly helpful. Redact personal content; attach a minimal PDF only if you have permission to share it. Never include API keys, secrets or `data.json`. Basic iPhone success is not a guarantee for every device or PDF.

## Related repositories

- Shared core: <https://github.com/laginae/note-reader-core>
- Desktop edition: <https://github.com/laginae/note-reader-cosyvoice>

## License

MIT
