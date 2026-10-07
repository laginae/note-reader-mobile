# 0.3.2 - Mobile panel spacing and data controls

- Give the expanded player a bounded height and vertical touch scrolling, and reserve bottom space so the final export button can move above floating native navigation. Tablets use a smaller safe-area allowance.
- Add separate Privacy controls for clearing the in-memory outline and saved reading positions. Position deletion requires confirmation; playback, documents, keys and exported audio are retained.
- Document audio lifecycle and WAV export prerequisites: an online engine and an existing reading queue. Export synthesizes the queue again and may incur provider charges.

Automated checks pass. The bottom-spacing change still needs verification on the reported iPhone; no claim of complete iOS/iPad/Android device validation is made.
