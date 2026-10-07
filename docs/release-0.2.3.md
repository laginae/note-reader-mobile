# 0.2.3 - Phone Safe Areas and iPad Layout

- Address the iPhone status-bar overlap reported in 0.2.2. Obsidian floating phone headers use fixed positioning, so DOM order alone did not reserve their space.
- While the reader is open, reserve the phone status safe area once and keep that pane's native title controls in normal layout. Remove duplicate document top spacing/fading. Closing the reader restores native behavior.
- Adapt to the pane width on iPad: one row for wide panes, stacked rows for Split View/Stage Manager and a separate progress row for very narrow windows. Phone-specific padding is not applied to tablet panes.
- Constrain touch-button padding and slider-thumb size so native tablet/iOS styles do not enlarge the compact controls.
- Keep playback and selection behavior unchanged.

Validation: 58 automated tests, production build, mobile API boundary and privacy checks pass. Layout rule checks are not real-device rendering tests. Full iPhone/iPad rotation, keyboard and multitasking validation remains pending. No paid speech requests or private note contents were used. Desktop and shared-core repositories are unchanged.

This is a testing prerelease. In BRAT, select `laginae/note-reader-mobile` and version `0.2.3`, then reload the plugin. A frozen older tag must be changed explicitly. This is not a community-directory submission.
