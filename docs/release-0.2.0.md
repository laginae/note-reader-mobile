# 0.2.0 - Mobile Testing Release

- Updated the pinned shared core without changing the desktop plugin.
- Added MiMo with Baihua as the default voice, conservative 200-character chunks and complete-generation/WAV checks.
- Added one custom speech API configuration for OpenAI-compatible speech, ElevenLabs and MiniMax, with configuration-bound consent, secret references and fail-closed custom HTTPS transport.
- Applied online playback rate locally; added volume, current-audio seeking and categorized settings.
- Added academic text handling and progressive opening audio while retaining logical chunk numbering.
- Validated audio responses and sanitized request errors, without automatic request retries.
- Retained synthesized audio when autoplay is blocked, allowing a user-tap retry without another synthesis; paused new synthesis while the app is hidden.
- Included the previously ignored source entry point and improved English/Chinese setup, privacy and limitation documentation.

No paid speech requests or private notes were used in automated testing. Android/iOS device tests remain pending. This is a GitHub testing prerelease, not a community-directory submission. Desktop 0.9.4 remains unchanged.
