# Short Formula Speech and Processing Cost

Validation for mobile version 0.8.2: 2026-11-03.

Concise short fractions preserve the whole numerator and denominator with natural sum/difference labels. Slash and supported `\frac` forms agree; short accents and subscripts retain their labels. Verbose speech, explicit skipping and smart-mode complexity limits are unchanged. Original text and highlight coordinates are preserved. PDF handling still requires reliable math/font evidence, rather than reconstructing every visual fraction. Start a new reading session after loading the updated plugin.

## Measurements

Measured using Node.js 24.15.0 on Windows, **not on an iPhone, iPad or Android device**. Fixed synthetic inputs only; no network calls, notes or account access. Each result is the median of nine warmed samples after three warm-up runs. Baseline is the local source immediately before this change, including the preceding common-operator improvement.

| Workload | Before | After |
| --- | ---: | ---: |
| 1,000 short formula conversions | 26.256 ms | 10.213 ms |
| 25,840-character text with 500 formulas | 16.187 ms | 8.124 ms |
| 61,000-character ordinary text | 0.016 ms | 0.016 ms |

The improvement reuses fixed symbol tables and compiled patterns and avoids repeated normalization. No document cache, background task, runtime dependency or startup scan was added. The new grammar also produces shorter speech, so this measures the complete before/after path. These numbers do not measure mobile app startup, PDF extraction, API latency, audible first sound or battery use. Real-device verification remains pending.

```sh
npm test
node scripts/benchmark-math.cjs
```

The benchmark accepts an optional path to another compatible `academic-speech.js` for comparison. Timings vary by environment; tests do not impose a wall-clock threshold. All 394 tests and the mobile compatibility check passed, including formula grouping, policy preservation, Markdown/HTML source mapping and recognized PDF whole/selection speech.
