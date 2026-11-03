'use strict';
const { registerMiniOutline, headingAt } = require('./mini-outline');
const { markdownOutline, sectionText } = require('./document-outline');
const { htmlReaderDocument, extractHtmlTree } = require('./html-text');
const { browsingIndex, elementHeading, pdfViewer, scrollDocumentEdge } = require('./mini-outline-position');
const { academicOptions } = require('@laginae/note-reader-core');

function mobileMiniAdapter(plugin) {
  const workspace = plugin.app.workspace;
  const valid = (view, data) => view.file === data.file && plugin.isOutlineCurrent(data.file, data.key)
    && (data.kind !== 'markdown' || view.editor?.getValue() === data.text)
    && (data.kind !== 'html' || (htmlReaderDocument(view) === data.doc && extractHtmlTree(data.doc.body, null, data.options).text === data.text));
  const current = (view, data) => {
    const session = plugin.readingHighlights?.session, queue = plugin.queue;
    if (!session || !queue?.items.length || ['complete', 'error'].includes(queue.status)
      || session.file !== data.file || session.mtime !== data.file.stat?.mtime
      || (data.kind === 'markdown' && session.text !== data.text)
      || (data.kind === 'html' && (session.doc !== data.doc || session.invalid))) return null;
    return { session, target: session.ranges[queue.currentIndex]?.[0] };
  };
  const adapter = {
    views: () => ['markdown', 'pdf', 'html-view'].flatMap(type => (workspace.getLeavesOfType?.(type) || []).map(leaf => leaf.view)),
    activeView: () => plugin.getSourceLeaf()?.view,
    busy: () => Boolean(plugin.exportModal?.busy), valid,
    playback: () => {
      const active = !!plugin.queue?.items.length && !['complete', 'error'].includes(plugin.queue.status) && !plugin.exportModal?.busy;
      return { active, session: plugin.sessionId, paused: !!plugin.pauseRequested,
        canToggle: active && plugin.phaseOverride !== 'extracting', canStop: active, title: plugin.sourceLabel };
    },
    togglePlayback: () => plugin.togglePause(),
    stopPlayback: () => plugin.stopReading({ quiet: true }),
    playbackError: error => plugin.fail(error),
    async load(view, cancelled, force) {
      const file = view.file, key = plugin.documentOutlineKey(file);
      let data;
      if (['md', 'markdown'].includes(file.extension)) {
        const text = view.editor?.getValue() ?? await plugin.app.vault.cachedRead(file);
        // The editor may contain unsaved changes that are not yet in metadataCache.
        data = markdownOutline(text);
      } else if (['html', 'htm'].includes(file.extension)) {
        const doc = htmlReaderDocument(view);
        if (!doc?.body) throw Error('HTML view unavailable');
        const options = plugin.settings.stripMarkdown ? academicOptions(plugin.settings) : {};
        const extracted = extractHtmlTree(doc.body, null, options);
        data = { kind: 'html', doc, text: extracted.text, entries: extracted.headings, options };
      } else {
        const cached = await plugin.loadPdfOutline(file, cancelled, () => {}, force);
        if (!cached) return null;
        data = { ...cached.data, kind: cached.data.kind || 'pdf' };
      }
      return !cancelled() && plugin.isOutlineCurrent(file, key) ? { ...data, file, key } : null;
    },
    pauseFollow() {},
    async locateEdge(view, data, end, cancelled = () => false) {
      if (cancelled()) return;
      if (!valid(view, data)) throw Error('Changed');
      await workspace.revealLeaf?.(view.leaf);
      if (cancelled()) return;
      if (!valid(view, data)) throw Error('Changed');
      return scrollDocumentEdge(view, data, end, workspace);
    },
    async locate(view, data, index) {
      if (!valid(view, data)) throw Error('Changed');
      await workspace.revealLeaf(view.leaf);
      if (!valid(view, data)) throw Error('Changed');
      await plugin.locateOutlineEntry(data.file, data.key, { ...data, kind: data.kind === 'pdf' ? undefined : data.kind }, index, () => !valid(view, data));
    },
    async read(view, data, index, remaining) {
      if (!valid(view, data) || adapter.busy()) throw Error('Changed');
      await workspace.revealLeaf(view.leaf);
      if (!valid(view, data) || adapter.busy()) throw Error('Changed');
      if (data.kind === 'markdown') return plugin.startTextSession(sectionText(data, index, remaining), {
        file: data.file, kind: 'markdown', sourceLabel: data.entries[index].title, sourceText: data.text, sourceOffset: data.entries[index].offset,
      });
      return plugin.readPdfSection(data.file, data.key, { ...data, kind: data.kind === 'pdf' ? undefined : data.kind }, index, remaining);
    },
    async returnReading(view, data) {
      if (!valid(view, data)) return;
      await workspace.revealLeaf(view.leaf);
      const target = current(view, data)?.target;
      if (!valid(view, data) || !target) return;
      if (target.kind === 'markdown') {
        const line = data.text.slice(0, target.from).split('\n').length - 1;
        if (view.getMode?.() === 'preview') view.previewMode?.applyScroll(line);
        else view.editor?.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
      } else if (target.kind === 'html') target.element?.scrollIntoView({ block: 'center' });
      else pdfViewer(view)?.scrollPageIntoView?.({ pageNumber: target.page, destArray: [null, { name: 'XYZ' }, target.rect[0], Math.max(target.rect[1], target.rect[3]), null] });
    },
    positions(view, data) {
      let reading = -1;
      const target = current(view, data)?.target;
      if (target?.kind === 'markdown') reading = headingAt(data.entries, target.from);
      else if (target?.kind === 'html') reading = elementHeading(data.entries, target.element);
      else if (target?.kind === 'pdf') {
        const page = data.pages.find(p => p.pageNumber === target.page);
        const line = page?.layout?.lines?.find(l => Math.abs(l.y - Math.max(target.rect[1], target.rect[3])) < 18 && l.xMin <= target.rect[2] && l.xMax >= target.rect[0]);
        data.entries.forEach((e, i) => { if (e.page < target.page || (e.page === target.page && line?.offset >= 0 && e.offset <= line.offset)) reading = i; });
      }
      return { reading, browsing: browsingIndex(view, data) };
    },
  };
  return adapter;
}
function installMiniOutline(plugin) { return registerMiniOutline(plugin, mobileMiniAdapter(plugin)); }
module.exports = { mobileMiniAdapter, installMiniOutline };
