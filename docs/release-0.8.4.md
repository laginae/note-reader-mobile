# Cozy Read Aloud Mobile 0.8.4

## Shared Formula Speech

- Pin Note Reader Core 0.3.0 at `1085cfa58c835236b3e90043d979a8c193bdf4ba`, using the same bounded formula parser as desktop 1.7.5 for Markdown, local HTML and supported PDF math runs.
- Add **Simple function speech**: default `f of x`, optional `f x` in concise style. Explicit structure and ordinary prose are unchanged.
- Add an optional lower-to-upper interval wording, while preserving endpoint inclusion by default.
- Sync negative exponents, escaped numeric percentages, decorated functions, short scripted arguments and complex-ratio safeguards. This does not reconstruct arbitrary PDF glyph layouts or perform OCR automatically.

## Optional Floating Controls

- Add opt-in 0.25x speed steps with one short updating notice; no audio is resynthesized.
- An additional off-by-default secondary-mouse option changes volume by ten percentage points. It does not intercept touch long-presses; touch retains the existing volume slider. Platform audio-volume restrictions may still apply.
- Controls remain visible on touch, respect available space and avoid the existing mobile bars. Unsupported system-speech actions remain disabled. UI-only preferences do not stop the current session.

## Verification and Limits

- Passed automated tests, the shared public math corpus and mobile runtime compatibility checks. Desktop-hosted touch/layout checks are not physical-device validation.
- **Mobile background playback remains experimental. Current-release iPhone, iPad and Android physical-device validation is pending.**
- OCR remains experimental, off by default, single-page and separately packaged. Use the matching optional OCR resource archive; it is not included in the main plugin bundle.
- No private prose, PDFs, credentials, installed settings, diagnostic extracts or backups are included. No online speech synthesis was required.

Restart/reload the plugin and begin a new session after updating. Existing engine, voice and credential choices are preserved.

## 中文摘要

同步桌面版的纯公式实现，新增“简单函数读法”和简洁区间选项，完善负指数、百分号、修饰函数与短下标参数。悬浮控制可选 ±0.25x 倍速，触屏保持可见；外接鼠标可选右键 ±10% 音量，不改变长按菜单。移动端后台播放和 OCR 仍为实验性功能；OCR 默认关闭、独立资源包、仅单页识别。本次自动检查不等于 iPhone／iPad／Android 真机验收，不包含私人正文或密钥。
