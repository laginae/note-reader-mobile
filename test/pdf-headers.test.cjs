const assert = require('node:assert/strict');
const test = require('node:test');
const { extractPdfTextLayout } = require('@laginae/note-reader-core');
const { edgeCandidates, recurringEdges, filterPageHeaders } = require('../src/pdf-headers');
const { extractPdfPages } = require('../src/pdf-extractor');

const viewport = { width: 600, height: 800, rotation: 0, viewBox: [0, 0, 600, 800] };
function item(str, x, y, size = 10) {
  return { str, width: Math.min(230, str.length * 5), height: size, transform: [size, 0, 0, size, x, y] };
}
function itemsFor(number) {
  return [item('A. Researcher et al.', 35, 775, 8), item('Journal 12 (2026) 123456', 330, 775, 8),
    item('A unique body paragraph.', 35, 650), item('More body text.', 35, 630),
    item('Right column body text.', 330, 650), item('Right column conclusion.', 330, 630),
    item('1 A numbered footnote remains.', 35, 65, 8), item(String(number), 295, 20, 8)];
}
function page(number, items = itemsFor(number), vp = viewport) {
  const layout = extractPdfTextLayout(items, { viewport: vp });
  return { pageNumber: number, text: layout.text, layout, edgeCandidates: edgeCandidates(layout, items, vp) };
}
function pdfFixture(count = 3, overrides = {}) {
  const calls = [], cleaned = [], progress = [];
  let destroyed = 0, documentCleaned = 0;
  const document = {
    numPages: count,
    async getPage(number) {
      calls.push(number);
      if (overrides.failPage === number) throw new Error('Unreadable sample');
      return {
        async getTextContent() { return { items: overrides.items?.(number) || itemsFor(number) }; },
        getViewport: () => viewport,
        cleanup: () => cleaned.push(number),
      };
    },
    cleanup() { documentCleaned += 1; },
    async destroy() { destroyed += 1; },
  };
  return { calls, cleaned, progress, counts: () => [documentCleaned, destroyed],
    run: (options = {}) => extractPdfPages({ vault: { readBinary: async () => new ArrayBuffer(4) } },
      { extension: 'pdf', stat: { size: 4 } }, {
        loadPdfJs: async () => ({ getDocument: () => ({ promise: Promise.resolve(document) }) }),
        onProgress: (value) => progress.push(value.pageNumber), ...options,
      }),
  };
}

test('repeated authors/journal lines and page numbers are removed without reordering columns', () => {
  const pages = [page(1), page(2), page(3)];
  const repeated = recurringEdges(pages);
  for (const original of pages) {
    const filtered = filterPageHeaders(original, repeated);
    assert.equal(filtered.omittedHeaderLines, 3);
    assert.doesNotMatch(filtered.text, /Researcher|Journal/);
    assert.match(filtered.text, /numbered footnote/);
    assert.equal(filtered.unfilteredText, original.text);
    assert.deepEqual(filtered.layout.lines, original.layout.lines.filter((line) => line.y >= 36 && line.y <= 744));
    assert.equal(original.layout.lines.length - filtered.layout.lines.length, 3);
  }
});

test('distinct page evidence is required and changing page digits are normalized', () => {
  const a = page(1, [item('Journal volume 12 page 1', 30, 775), item('Body paragraph.', 30, 500)]);
  const b = page(2, [item('Journal volume 12 page 2', 30, 775), item('Body paragraph.', 30, 500)]);
  assert.equal(recurringEdges([a, a]).size, 0);
  assert.equal(recurringEdges([a, b]).size, 1);
  assert.doesNotMatch(filterPageHeaders(a, recurringEdges([a, b])).text, /Journal/);
});

test('single-page numbers are filtered but unique short edge text is retained', () => {
  const original = page(1, [item('A unique running title', 30, 775), item('Body paragraph.', 30, 500), item('Page 1 of 8', 250, 20)]);
  const filtered = filterPageHeaders(original, new Set());
  assert.match(filtered.text, /unique running title/);
  assert.doesNotMatch(filtered.text, /Page 1 of 8/);
});

test('alternating page-edge positions are recognized without treating same-page duplicates as evidence', () => {
  const pages = [1, 2, 3, 4].map((n) => page(n, [item('Running article title', n % 2 ? 30 : 330, 775), item('Body paragraph.', 30, 500)]));
  const repeated = recurringEdges(pages);
  assert.equal(repeated.size, 2);
  assert.ok(pages.every((p) => !filterPageHeaders(p, repeated).text.includes('Running article title')));
});

test('large titles, numbered headings, ordinary body and footnotes are not edge candidates', () => {
  for (const title of ['1.2.3 Methods', 'Appendix C. Results', 'Chapter 1', 'III. Methods']) {
    const p = page(1, [item(title, 30, 775), item('Normal body text.', 30, 500), item('1 Footnote explanation.', 30, 20, 8)]);
    assert.equal(p.edgeCandidates.length, 0, title);
  }
  const p = page(1, [item('Large paper title', 30, 775, 20), item('Normal body text.', 30, 500), item('Body near the top.', 30, 730)]);
  assert.equal(p.edgeCandidates.length, 0);
});

test('missing coordinates, rotated pages and header-only pages are preserved', () => {
  const fallback = page(1, [{ str: 'Plain fallback text.' }]);
  assert.equal(fallback.edgeCandidates.length, 0);
  assert.equal(filterPageHeaders(fallback, new Set()), fallback);
  assert.equal(page(1, itemsFor(1), { ...viewport, rotation: 90 }).edgeCandidates.length, 0);
  const only = page(1, [item('1', 250, 20), item('Journal', 30, 775)]);
  assert.equal(filterPageHeaders(only, new Set(only.edgeCandidates.map((c) => c.key))), only);
});

test('crop-box offsets are respected when measuring edge bands', () => {
  const shifted = itemsFor(1).map((source) => ({ ...source, transform: [...source.transform.slice(0, 4), source.transform[4] + 100, source.transform[5] + 200] }));
  const p = page(1, shifted, { ...viewport, viewBox: [100, 200, 700, 1000] });
  assert.equal(p.edgeCandidates.length, 3);
  assert.deepEqual(p.edgeCandidates.map((c) => c.key), page(1).edgeCandidates.map((c) => c.key));
});

test('full PDF extraction filters by default and releases every page/document', async () => {
  const fixture = pdfFixture();
  const pages = await fixture.run();
  assert.equal(pages.length, 3);
  assert.ok(pages.every((p) => p.omittedHeaderLines === 3));
  assert.deepEqual(fixture.calls, [1, 2, 3]);
  assert.deepEqual(fixture.cleaned, [1, 2, 3]);
  assert.deepEqual(fixture.progress, [1, 2, 3]);
  assert.deepEqual(fixture.counts(), [1, 1]);
});

test('disabled filtering preserves original text and avoids look-behind sampling', async () => {
  const fixture = pdfFixture(8);
  const pages = await fixture.run({ skipHeaders: false, startPageNumber: 8 });
  assert.equal(pages[0].text, page(8).text);
  assert.equal(pages[0].unfilteredText, undefined);
  assert.deepEqual(fixture.calls, [8]);
});

test('resuming on the last page samples at most three preceding pages, not their speech text', async () => {
  const fixture = pdfFixture(10);
  const pages = await fixture.run({ startPageNumber: 10 });
  assert.deepEqual(fixture.calls, [7, 8, 9, 10]);
  assert.deepEqual(fixture.progress, [10]);
  assert.deepEqual(pages.map((p) => p.pageNumber), [10]);
  assert.equal(pages[0].omittedHeaderLines, 3);
});

test('optional sample failures do not block reading but requested page failures still propagate', async () => {
  const fixture = pdfFixture(5, { failPage: 2 });
  assert.equal((await fixture.run({ startPageNumber: 5 }))[0].omittedHeaderLines, 3);
  const failed = pdfFixture(5, { failPage: 5 });
  await assert.rejects(failed.run({ startPageNumber: 5 }), /Unreadable sample/);
  assert.deepEqual(failed.counts(), [1, 1]);
});

test('cancellation during look-behind stops extraction and cleans up', async () => {
  const fixture = pdfFixture(10);
  const pages = await fixture.run({ startPageNumber: 10, isCancelled: () => fixture.calls.length > 0 });
  assert.deepEqual(pages, []);
  assert.deepEqual(fixture.calls, [7]);
  assert.deepEqual(fixture.cleaned, [7]);
  assert.deepEqual(fixture.counts(), [1, 1]);
});
