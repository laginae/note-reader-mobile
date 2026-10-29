# Cozy Read Aloud Mobile 0.4.0

**Background playback is experimental and off by default.** iOS may suspend the app; continuous playback while locked or in the background is not guaranteed and has not yet passed iPhone/iPad physical-device acceptance.

**移动端后台播放仍为实验性功能，默认关闭。** iOS 可能暂停应用，锁屏或切到后台后不保证连续播放，尚未完成 iPhone/iPad 真机连续播放验收。

- Optional device-only reusable online/self-hosted audio cache, off by default. Up to 24 hours / 64 MiB / 128 parts, with clear and expiry controls. Audio is sensitive and is not encrypted by the plugin; no plaintext document or credential records are stored.
- Optional experimental background audio mode, off by default. Supports available system media controls, suppresses hidden UI redraws, and uses generic lock-screen metadata. System speech still pauses when hidden.
- Background mode does not prevent iOS from suspending the application. iPhone/iPad lock-screen continuity has not yet passed physical-device acceptance; do not treat API availability as proof of background reliability.
- Shared synthetic PDF full/selection parity checks, cache/consent tests and background-control regressions.
- Updated English and Chinese documentation. Existing engine choices and permissions are preserved.
