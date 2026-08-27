# Note and PDF Voice Reader Mobile

A mobile-first Obsidian read-aloud plugin for Markdown notes and text-based PDFs.

## Current capabilities

- Read selected note or PDF text
- Continue reading from a selected position
- Read an entire active note or text-based PDF
- Resume from a privacy-bounded saved position
- Coordinate-aware single-column, two-column, and mixed-layout PDF ordering
- Device system speech with no text sent by the plugin to an online TTS service
- Optional Microsoft Azure Speech, OpenRouter TTS, and HTTPS remote CosyVoice
- Touch-sized controls, vertical layouts, pause/resume, and chunk navigation
- Online synthesis is strictly on demand: the plugin does not pre-synthesize future chunks

## Privacy

The default engine is device system speech. The plugin itself makes no TTS network request in that mode.

Azure, OpenRouter, and remote CosyVoice are opt-in. Only the current chunk is sent after the corresponding consent setting is enabled. API keys are read from Obsidian SecretStorage; only secret names are saved in `data.json`. OpenRouter requests hard-code `provider.zdr: true` and `provider.data_collection: "deny"`.

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

## Development

```bash
npm install
npm test
```

This repository consumes [`@laginae/note-reader-core`](https://github.com/laginae/note-reader-core). It contains no Node.js, Electron, filesystem, child-process, or local executable calls.

Before community publication, test with Obsidian mobile emulation and on at least one Android and one iOS device. Mobile operating systems may pause audio when Obsidian is backgrounded; the plugin deliberately pauses when the app becomes hidden.

## Related repositories

- Shared core: <https://github.com/laginae/note-reader-core>
- Desktop edition: <https://github.com/laginae/note-reader-cosyvoice>

## License

MIT
