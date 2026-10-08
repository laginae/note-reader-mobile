# 0.3.7 - Optional prefetch and session audio cache

- Add an optional Prepare next audio part setting, off by default. When enabled, online synthesis is limited to two simultaneous operations and one future audio part.
- Reuse in-flight requests and recently prepared audio in a bounded, memory-only session cache. Cached revisits avoid unnecessary synthesis.
- Prioritize the latest queued seek target and discard stale results after stop or navigation. Pause prevents queued requests from starting.
- Clear cached audio on stop, new document, relevant configuration changes, or plugin unload. Exported files and saved reading positions are not cache files.
- Add an on-demand command to copy numeric waiting-time statistics without note text or credentials. No automatic telemetry.

Validation: 140 tests and the mobile compatibility boundary check passed. This release has not yet received new iPhone/iPad device validation. Prefetch may synthesize audio that is not ultimately played, and already-sent requests may still be billed. Provider quotas apply; no zero-delay playback guarantee is made.
