'use strict';

function alignPreviewHeading(view, entry) {
  const renderer = view.previewMode?.renderer;
  const scroll = renderer?.previewEl;
  if (!scroll?.getBoundingClientRect || !Array.isArray(renderer.sections)) return false;
  // Use the source anchor, not a title search: headings can repeat or contain markup.
  const section = renderer.sections.find((item) => item.start?.line === entry.line
    && item.start?.offset === entry.offset && item.el?.querySelector?.('h1,h2,h3,h4,h5,h6'));
  const heading = section?.el.querySelector('h1,h2,h3,h4,h5,h6');
  if (!heading?.isConnected || !scroll.contains(heading)) return false;
  const rect = heading.getBoundingClientRect(), viewport = scroll.getBoundingClientRect();
  const host = view.containerEl?.getBoundingClientRect?.() || viewport;
  const dock = view.containerEl?.querySelector?.('.note-reader-mobile-dock')?.getBoundingClientRect();
  let top = Math.max(0, viewport.top, host.top);
  if (dock?.height > 0 && dock.left < viewport.right && dock.right > viewport.left) top = Math.max(top, dock.bottom);
  const bottom = Math.min(viewport.bottom, host.bottom);
  if (![rect.top, rect.height, top, bottom, scroll.scrollTop].every(Number.isFinite)
    || rect.height <= 0 || bottom - top < 24) return false;
  scroll.scrollTop = Math.max(0, scroll.scrollTop + rect.top - top - 12);
  return true;
}

async function locateMarkdownPreview(leaf, entry, isCurrent) {
  const view = leaf.view, preview = view.previewMode;
  if (typeof preview?.applyScroll === 'function') preview.applyScroll(entry.line);
  else if (typeof leaf.setEphemeralState === 'function') leaf.setEphemeralState({ line: entry.line });
  else return false;
  if (preview?.renderer?.previewEl) {
    // Mobile toolbars and virtualized preview sections can reflow after native navigation.
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (!isCurrent() || leaf.view !== view || view.getMode?.() !== 'preview') throw new Error('Navigation cancelled.');
    alignPreviewHeading(view, entry);
  }
  return true;
}

module.exports = { alignPreviewHeading, locateMarkdownPreview };
