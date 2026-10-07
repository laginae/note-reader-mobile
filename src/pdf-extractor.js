'use strict';

const { extractPdfTextLayout } = require('@laginae/note-reader-core');
const { edgeCandidates, recurringEdges, filterPageHeaders } = require('./pdf-headers');

const PDF_MAX_BYTES = 200 * 1024 * 1024;
const PDF_MAX_PAGES = 2000;
const PDF_MAX_TEXT_CHARS = 5_000_000;

async function extractPdfPages(app, file, options = {}) {
  if (!file || String(file.extension || '').toLowerCase() !== 'pdf') {
    throw new Error('The active file is not a PDF.');
  }
  if (Number(file.stat && file.stat.size) > PDF_MAX_BYTES) {
    throw new Error('This PDF is larger than 200 MB. Split or compress it before reading.');
  }
  if (!app || !app.vault || typeof app.vault.readBinary !== 'function') {
    throw new Error('Obsidian could not read the active PDF.');
  }
  if (typeof options.loadPdfJs !== 'function') {
    throw new Error('PDF text extraction is unavailable in this Obsidian version.');
  }

  const [pdfjsLib, binary] = await Promise.all([
    options.loadPdfJs(),
    app.vault.readBinary(file),
  ]);
  if (!pdfjsLib || typeof pdfjsLib.getDocument !== 'function') {
    throw new Error('Obsidian PDF.js did not load correctly.');
  }

  const data = binary instanceof Uint8Array
    ? new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength)
    : new Uint8Array(binary);
  const loadingTask = pdfjsLib.getDocument({ data });
  let document = null;

  try {
    document = await loadingTask.promise;
    const totalPages = Math.max(0, Math.floor(Number(document.numPages) || 0));
    if (!totalPages) {
      throw new Error('This PDF contains no readable pages.');
    }
    if (totalPages > PDF_MAX_PAGES) {
      throw new Error(`This PDF has more than ${PDF_MAX_PAGES} pages. Split it before reading.`);
    }

    const requestedStart = Math.floor(Number(options.startPageNumber) || 1);
    const startPageNumber = Math.max(1, Math.min(totalPages, requestedStart));
    const pages = [];
    const samples = [];
    let textLength = 0;

    async function readLayout(pageNumber) {
      let page;
      try {
        page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const viewport = page.getViewport?.({ scale: 1 });
        const layout = extractPdfTextLayout(content?.items, { viewport });
        return { layout, pageNumber, text: layout.text, totalPages,
          edgeCandidates: options.skipHeaders !== false ? edgeCandidates(layout, content?.items, viewport) : [] };
      } finally { page?.cleanup?.(); }
    }

    // Bounded local look-behind also recognizes running headers when resuming near the end.
    if (options.skipHeaders !== false) {
      for (let number = Math.max(1, startPageNumber - 3); number < startPageNumber; number += 1) {
        if (options.isCancelled?.()) return [];
        try {
          const sample = await readLayout(number);
          samples.push({ pageNumber: number, edgeCandidates: sample.edgeCandidates });
        } catch { /* Optional evidence must not prevent reading the requested pages. */ }
      }
    }

    for (let pageNumber = startPageNumber; pageNumber <= totalPages; pageNumber += 1) {
      if (typeof options.isCancelled === 'function' && options.isCancelled()) {
        return [];
      }
      if (typeof options.onProgress === 'function') {
        options.onProgress({ pageNumber, totalPages });
      }

      const page = await readLayout(pageNumber);
      textLength += page.text.length;
      if (textLength > PDF_MAX_TEXT_CHARS) {
        throw new Error('This PDF contains more than 5,000,000 extractable characters. Split it before reading.');
      }
      pages.push(page);
    }

    if (!pages.some((page) => page.text.trim())) {
      throw new Error('No extractable text was found. This PDF may be scanned or image-only; run OCR first.');
    }
    if (options.isCancelled?.()) return [];
    const repeated = recurringEdges([...samples, ...pages]);
    return options.skipHeaders === false ? pages : pages.map((page) => filterPageHeaders(page, repeated));
  } finally {
    if (document && typeof document.cleanup === 'function') {
      document.cleanup();
    }
    if (document && typeof document.destroy === 'function') {
      await document.destroy();
    } else if (loadingTask && typeof loadingTask.destroy === 'function') {
      await loadingTask.destroy();
    }
  }
}

module.exports = {
  PDF_MAX_BYTES,
  PDF_MAX_PAGES,
  PDF_MAX_TEXT_CHARS,
  extractPdfPages,
};
