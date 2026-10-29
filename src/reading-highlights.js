'use strict';

const { academicOptions } = require('@laginae/note-reader-core');
const { compact, mapSpeechBlocks, markdownHighlightSource } = require('./highlight-source');
const { extractHtmlTree, htmlReaderDocument, isHtmlFile } = require('./html-text');
const MARK = 'note-reader-mobile-speaking';
const OVERLAY = 'note-reader-mobile-pdf-highlight';

class ReadingHighlights {
  constructor(plugin) { this.plugin = plugin; this.marked = new Set(); this.overlays = []; this.editors = new Set(); this.session = null; }
  begin(raw, chunks, context, clean) {
    this.clear(); this.session = null;
    const file = context.file;
    if (!file || context.settingsPreview) return;
    const view = this.plugin.getSourceLeaf()?.view;
    if (view?.file !== file) return;
    let source;
    if (context.highlightRanges) source = { kind: 'pdf', ranges: context.highlightRanges };
    else if (isHtmlFile(file)) {
      const doc = htmlReaderDocument(view), options = this.plugin.settings.stripMarkdown ? academicOptions(this.plugin.settings) : {};
      if (!doc?.body) return;
      const text = extractHtmlTree(doc.body, null, options).text;
      const elements = [...doc.body.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,pre,td,th,blockquote,div')]
        .filter(el => !el.closest('nav,footer,form,template,[hidden],[aria-hidden="true"]')
          && el.getClientRects().length && doc.defaultView.getComputedStyle(el).visibility === 'visible'
          && !el.querySelector('p,h1,h2,h3,h4,h5,h6,li,pre,td,th,blockquote,div'));
      const blocks = elements.map(element => ({ speech: compact(clean(extractHtmlTree(element, null, options).text)), target: { kind: 'html', element } }));
      source = { kind: 'html', doc, text, options, ranges: mapSpeechBlocks(blocks, chunks) };
    } else if (['md', 'markdown'].includes(String(file.extension).toLowerCase()) && typeof raw === 'string') {
      const text = context.sourceText ?? view.editor?.getValue?.();
      source = markdownHighlightSource(raw, chunks.map(c => typeof c === 'string' ? c : c.text), clean, { sourceText: text, sourceOffset: context.sourceOffset });
      this.installEditor();
    }
    if (source) this.session = { ...source, file, mtime: file.stat?.mtime, view };
  }
  current() {
    const p = this.plugin, s = this.session, view = p.getSourceLeaf()?.view;
    if (!s || p.settings.readingHighlight === false || !p.queue.items.length || ['complete', 'error'].includes(p.queue.status)
      || (typeof document !== 'undefined' && document.hidden) || view?.file !== s.file || s.file.stat?.mtime !== s.mtime) return null;
    if (s.kind === 'markdown' && view.editor?.getValue?.() !== s.text) return null;
    if (s.kind === 'html' && (htmlReaderDocument(view) !== s.doc || s.invalid)) return null;
    return { ...s, view, targets: s.ranges[p.queue.currentIndex] || [] };
  }
  update(force = false) {
    try { this.draw(force); } catch { this.clear(); }
  }
  draw(force) {
    const data = this.current();
    if (!data) { this.clear(); return; }
    const key = `${this.plugin.queue.currentIndex}`;
    if (!force && key === this.key && data.view === this.view) return;
    this.clear(); this.key = key; this.view = data.view;
    const root = data.kind === 'html' ? data.doc.body : data.view.contentEl;
    if (data.kind === 'markdown') {
      if (data.view.getMode?.() === 'preview') {
        const sections = data.view.previewMode?.renderer?.sections || [];
        for (const section of sections) {
          const from = section.start?.offset, to = section.end?.offset;
          if (!section.el?.isConnected || !(to > from)) continue;
          const targets = data.targets.filter(target => target.from < to && target.to > from);
          if (!targets.length) continue;
          // Do not tint a whole list when only one item is being read.
          if (section.el.querySelector('li')) {
            for (const target of targets) {
              const speech = compact(this.plugin.prepareText(data.text.slice(target.from, target.to)));
              const matches = [...section.el.querySelectorAll('li')].filter(li => !li.querySelector('li') && compact(this.plugin.prepareText(li.textContent)) === speech);
              if (matches.length === 1) this.mark(matches[0]);
            }
          } else this.mark(section.el);
        }
      }
      this.refreshEditors();
    } else if (data.kind === 'html') {
      if (extractHtmlTree(root, null, data.options).text !== data.text) { this.session.invalid = true; return; }
      const style = data.doc.createElement('style');
      style.textContent = `.${MARK}{background-color:rgba(232,182,53,.22)!important;box-shadow:inset 3px 0 rgba(184,137,20,.65)!important}`;
      data.doc.head?.append(style); this.htmlStyle = style;
      for (const target of data.targets) if (target.element.isConnected && root.contains(target.element)) this.mark(target.element);
    } else {
      const child = data.view.viewer?.child || data.view.pdfViewer?.child;
      const viewer = [child?.pdfViewer?.pdfViewer, child?.pdfViewer, child?.pdfViewerApplication?.pdfViewer]
        .find(candidate => typeof candidate?.getPageView === 'function');
      const groups = new Map();
      for (const target of data.targets) {
        const page = viewer?.getPageView?.(target.page - 1);
        if (!page?.div?.isConnected || !page.viewport?.convertToViewportRectangle) continue;
        const rect = page.viewport.convertToViewportRectangle(target.rect);
        if (!rect.every(Number.isFinite)) continue;
        if (!groups.has(page)) groups.set(page, []);
        groups.get(page).push(rect);
      }
      for (const [page, rects] of groups) {
        const overlay = page.div.ownerDocument.createElement('div');
        overlay.className = OVERLAY; overlay.setAttribute('aria-hidden', 'true');
        for (const rect of rects) {
          const mark = overlay.ownerDocument.createElement('div');
          const left = Math.min(rect[0], rect[2]), top = Math.min(rect[1], rect[3]);
          mark.style.left = `${left}px`; mark.style.top = `${top}px`;
          mark.style.width = `${Math.abs(rect[2] - rect[0])}px`; mark.style.height = `${Math.abs(rect[3] - rect[1])}px`;
          overlay.append(mark);
        }
        page.div.append(overlay); this.overlays.push(overlay);
      }
    }
    const win = root?.ownerDocument?.defaultView;
    if (root && win?.MutationObserver) {
      this.observer = new win.MutationObserver(records => {
        const owned = node => node.nodeType === 1 && (node.classList.contains(OVERLAY) || node.closest(`.${OVERLAY}`));
        if (records.every(record => record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(owned))) return;
        this.schedule();
      });
      this.observer.observe(root, { childList: true, characterData: true, subtree: true });
      if (win.ResizeObserver) {
        let width = root.clientWidth, height = root.clientHeight;
        this.resize = new win.ResizeObserver(() => {
          if (root.clientWidth === width && root.clientHeight === height) return;
          width = root.clientWidth; height = root.clientHeight; this.schedule();
        });
        this.resize.observe(root);
      }
    }
  }
  schedule() {
    if (this.pending) return;
    this.pending = setTimeout(() => { this.pending = null; this.update(true); }, 80);
  }
  mark(element) { element.classList.add(MARK); this.marked.add(element); }
  clear() {
    this.observer?.disconnect(); this.observer = null; this.resize?.disconnect(); this.resize = null;
    if (this.pending) clearTimeout(this.pending); this.pending = null;
    for (const element of this.marked) element.classList.remove(MARK);
    this.marked.clear();
    for (const overlay of this.overlays) overlay.remove(); this.overlays = [];
    this.htmlStyle?.remove(); this.htmlStyle = null;
    this.key = null; this.view = null;
    this.refreshEditors();
  }
  dispose() { this.session = null; this.clear(); }
  refreshEditors() { for (const editor of this.editors) editor.refresh(); }
  installEditor() {
    if (this.editorInstalled || !this.plugin.registerEditorExtension) return;
    this.editorInstalled = true;
    const { StateEffect } = require('@codemirror/state');
    const { Decoration, ViewPlugin } = require('@codemirror/view');
    const { editorInfoField } = require('obsidian');
    const controller = this, effect = StateEffect.define();
    this.plugin.registerEditorExtension(ViewPlugin.fromClass(class {
      constructor(view) { this.view = view; this.decorations = Decoration.none; controller.editors.add(this); this.rebuild(); }
      ranges() {
        const data = controller.current(), info = this.view.state.field(editorInfoField, false);
        return data?.kind === 'markdown' && info?.file?.path === data.file.path && this.view.state.doc.toString() === data.text ? data.targets : [];
      }
      rebuild() {
        const ranges = this.ranges(); this.key = JSON.stringify(ranges);
        this.decorations = Decoration.set(ranges.filter(r => r.to > r.from).map(r => Decoration.mark({ class: MARK }).range(r.from, r.to)), true);
      }
      update(update) { if (update.docChanged || update.transactions.some(t => t.effects.some(e => e.is(effect)))) this.rebuild(); }
      refresh() { if (JSON.stringify(this.ranges()) !== this.key) this.view.dispatch({ effects: effect.of(null) }); }
      destroy() { controller.editors.delete(this); }
    }, { decorations: value => value.decorations }));
  }
}

module.exports = { ReadingHighlights };
