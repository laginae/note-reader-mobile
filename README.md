# Note and PDF Voice Reader Mobile

[English](README.md) | [简体中文](README.zh-CN.md)

A mobile-first Obsidian read-aloud plugin for Markdown notes and text-based PDFs.

**0.2.2 is a mobile testing release.** Automated checks are included; full Android and iOS device validation remains pending. This is a separate plugin and does not change the desktop edition.

## Install and Start

1. Use Obsidian 1.11.4 or later and back up your vault.
2. Download `main.js`, `manifest.json` and `styles.css` from [GitHub Releases](https://github.com/laginae/note-reader-mobile/releases).
3. Put the three files in `<vault>/.obsidian/plugins/note-reader-mobile/` using your device file manager or vault sync, then enable the plugin. Do not copy another vault's `data.json` or credentials.
4. Start with device system speech, or choose an online engine and explicitly enable processing after configuring its secret.

This release is not a community-directory submission. Avoid starting the desktop and mobile plugins at the same time in one vault.

## Current capabilities

### Phone controls

The reader icon and `Show reading toolbar` command open a compact bar above the current note or PDF, below its title bar, without switching to a separate tab. The controls reserve their own space outside the document scroll area to avoid iOS floating bottom navigation. Select a reading scope and press Play. Pause/resume, previous/next chunk, current-audio seeking and playback speed are available beside the document. Seeking only applies to loaded online audio, not system speech.

Expand opens the full player. Its back arrow returns to the document without stopping playback; Close stops and hides the reader. Select text and choose Continue from selection to start there. The source selection is retained in memory before opening the panel, not written to settings; select it again after editing the document.

iOS/Android device verification is still needed, particularly for native selection menus and PDF views.

- Read selected note or PDF text
- Continue reading from a selected position
- Read an entire active note or text-based PDF
- Resume from a privacy-bounded saved position
- Coordinate-aware single-column, two-column, and mixed-layout PDF ordering
- Device system speech with no text sent by the plugin to an online TTS service
- Optional Xiaomi MiMo, Microsoft Azure Speech, OpenRouter TTS, HTTPS remote CosyVoice and a custom speech API (BYOK)
- Touch-sized controls, vertical layouts, pause/resume, and chunk navigation
- Online synthesis is strictly on demand: the plugin does not pre-synthesize future chunks
- Local online-audio playback speed, volume and seeking within the currently loaded audio
- Categorized settings, academic text handling and progressive opening audio within logical chunks

## Online Setup

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

| Capability | Mobile 0.2.2 testing edition | Desktop 0.9.4 |
| --- | --- | --- |
| Markdown and text PDFs | Supported; device testing pending | Supported |
| MiMo and custom speech APIs | Added; device/provider checks pending | Available |
| Local executable / Python engines | Not included | Available |
| Academic text cleanup | Shared-core opt-in algorithms | Available |
| Highlights and PDF outline/bookmark tools | Not included | Available |
| HTML, Web viewer, Copilot, audio export | Not included | Available |

- Online synthesis uses normal speed; playback rate is applied locally, avoiding doubled speed or a new paid synthesis merely to change speed. System speech rate/volume changes may apply at the next utterance.
- The five-second buttons and current-audio slider only seek within the loaded online audio, not future chunks or system speech.
- PDF extraction finishes before playback; this is not the desktop progressive-PDF implementation. Image-only PDFs need OCR.
- Highlighting, PDF outline/bookmark editing, HTML/Web viewer/Copilot integration and audio export are not included in this release.
- Reading-order and resume anchors are heuristic. Complex PDFs and changed files may need a new selected starting point.
- Background/lock-screen playback is not guaranteed. The plugin pauses when the app is hidden.
- If the device blocks autoplay, tap Resume to play the retained audio; this does not request another synthesis.

## Development

```bash
npm ci
npm test
```

This repository consumes [`@laginae/note-reader-core`](https://github.com/laginae/note-reader-core). It contains no Node.js, Electron, filesystem, child-process, or local executable calls.

Before community publication, complete the [device checklist](docs/mobile-validation.md) on Android and iOS. Mocked tests do not send notes or charge speech accounts. The source entry point is included so the release bundle can be rebuilt from this repository.

## Related repositories

- Shared core: <https://github.com/laginae/note-reader-core>
- Desktop edition: <https://github.com/laginae/note-reader-cosyvoice>

## License

MIT
