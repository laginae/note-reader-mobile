# 0.2.2 - Avoid iOS Navigation Overlap

- Move the compact reading bar above the document, below its title, so it is not positioned underneath Obsidian's floating bottom navigation on iOS.
- Reserve space outside the document scroll area instead of covering text with a fixed overlay.
- Account for left/right safe areas in landscape, without unnecessary bottom safe-area padding.
- Preserve selection handling, playback controls, and the full panel's return/close actions.
- Add regression coverage for toolbar placement with PDF wrappers, refresh stability and layout cleanup.

Validation: 54 automated tests, production build and mobile API boundary checks pass. The reported iOS overlap was visible in the user's screenshot; the new placement still needs real-device confirmation. No paid speech APIs were called. Desktop and shared-core repositories are unchanged.

This remains a testing prerelease, not an Obsidian community-directory submission. In BRAT, choose repository `laginae/note-reader-mobile` and version `0.2.2`. Change the pinned version if currently using `0.2.0` or `0.2.1`, then reload the plugin.
