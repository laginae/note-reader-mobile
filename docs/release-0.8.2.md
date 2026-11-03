# Cozy Read Aloud Mobile 0.8.2

## Natural Formula Reading

- Sync standalone common operators such as `\max`, `\min`, `\lim` and `\sum`, plus simple single-argument functions such as `\sin x` and `\ln(x)`.
- Concise short fractions preserve grouping naturally: `(x-y)/\bar z` reads as "the difference of x and y, divided by z bar"; `x/(y+z)` reads as "x divided by the sum of y and z". Supported `\frac` forms use the same rule.
- Keep verbose structural cues, explicit skip settings, smart-mode complex-formula safeguards and original highlight coordinates. PDF math still requires reliable text/font evidence.
- Reuse fixed symbol tables and patterns and avoid repeated normalization without adding a document cache, background task or external dependency.

## Verification and Limits

- Passed 394 automated tests and the mobile compatibility check. Markdown/HTML source mapping and recognized PDF whole/selection paths are covered.
- The formula benchmark was run on Windows with Node, not phone hardware: 1,000 synthetic conversions decreased from about 26 ms to 10 ms. This is not a measurement of mobile startup, API latency, audible first sound or battery use.
- **Mobile background playback remains experimental. Current-release iPhone, iPad and Android physical-device validation is still pending.**
- Tests and documentation contain synthetic examples only. No private documents, account credentials or local backups are included; no online synthesis was required.

Reload the plugin or restart Obsidian after updating, then start a new reading session. Previously prepared audio is unchanged. Existing settings and credentials are preserved. OCR remains optional and disabled by default; use the matching optional resource archive when enabling it.

## 中文摘要

同步桌面端的常见运算符、简单函数和自然短分式读法，保留完整结构模式、复杂公式跳过及原文高亮。已通过自动化测试与移动兼容性检查，但不是手机真机验收。**移动端后台播放仍为实验性功能，本次 iPhone、iPad、Android 真机验证尚待完成。** 更新后重载插件或重启 Obsidian，再开始新的朗读会话。
