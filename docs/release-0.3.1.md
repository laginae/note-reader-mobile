# 0.3.1 - Sentence-first reading and document outlines

- Prefer complete sentences over filling the current audio chunk. Only an oversized sentence is split; MiMo retains the 200-character cap. Preserve text and avoid splitting surrogate pairs.
- Conservatively join PDF cross-page continuations and retain the starting page metadata.
- Add Markdown and local HTML heading outlines, section reading and cached extraction. HTML uses h1-h6 headings and requires HTML Reader for source navigation.
- Click an outline title to locate the source without starting speech. Use the adjacent range button to select Read section or Read from section.
- Locate PDF headings with available viewer coordinates; otherwise open the corresponding page with an explicit fallback notice. Keep the outline open when HTML navigation cannot be resolved safely.
- Update bilingual documentation and community copy. Desktop and shared core repositories are unchanged.

Automated tests, browser-only API checks and production build pass. These additions still require broader iOS/iPad/Android real-device testing. The previously user-confirmed basic iPhone workflow does not validate every new navigation feature or PDF layout.
