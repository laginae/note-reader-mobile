# Cozy Read Aloud Mobile 0.7.0

- Mini-outline width now supports 180-600 pixels with narrow-pane controls. Desktop simulation hides idle scrollbars; touch devices keep native scrolling feedback and visible controls.
- New supported presets prefer provider-identified female voices, including MiMo Bing Tang, Azure Sonia, Fish UK English female, Kokoro Emma, MAI Emily/Harper, ElevenLabs Sarah and Gemini Sulafat. Existing saved voices and permissions stay unchanged; male options remain. Device/system and custom voices still depend on their service.
- Added affected-official-profile warnings for OpenAI Speech deprecations and an optional **OpenAI Realtime (experimental)** BYOK type with new explicit authorization. No microphone, tools or prior segments are sent. Short-lived per-segment sessions return checked, buffered WAV audio for existing playback and export controls.
- Missing/completed-event inconsistencies, transcript mismatches, excessive output, cancellation and revoked permission fail closed without automatic retry. Numbers and mixed text may trigger conservative rejection. A matching generated transcript does not prove audible accuracy.

**Validation:** Automated tests use public samples and synthetic service responses. Live OpenAI account access, CORS, audible quality, iPhone/iPad/Android behavior and interrupted/background connections are not verified. The new Realtime option is experimental and off unless selected and explicitly authorized. See [setup and limits](docs/openai-realtime.md).

**Mobile background playback remains experimental and disabled by default.** This release does not claim lock-screen, interruption, Bluetooth or background reliability. Optional OCR also remains experimental, default-off, separately installed and single-page.

No private text, PDFs or credentials are distributed. The release workflow verifies and attests the plugin assets and packages the matching optional OCR resource archive.
