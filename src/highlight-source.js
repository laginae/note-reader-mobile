'use strict';

const { preparePdfSpeech } = require('./pdf-speech');
const compact = value => String(value || '').replace(/\s/g, '');

function uniqueIndex(text, needle) {
  const at = needle ? text.indexOf(needle) : -1;
  return at >= 0 && text.indexOf(needle, at + 1) < 0 ? at : -1;
}

// Retain source offsets without changing the text sent to speech synthesis.
function markdownBlocks(text) {
  const blocks = []; let offset = 0, start = 0, fence = '', math = false, comment = '', frontmatter = /^---\r?\n/.test(text);
  const flush = end => { if (end > start) blocks.push({ from: start, to: end, text: text.slice(start, end) }); start = end; };
  for (const match of text.matchAll(/[^\n]*\n|[^\n]+$/g)) {
    const line = match[0], trimmed = line.trim();
    const special = /^\s*(?:#{1,6}\s|[-+*]\s|\d+[.)]\s)/.test(line);
    if (!fence && !math && !comment && !frontmatter && special) flush(offset);
    const marker = trimmed.match(/^(`{3,}|~{3,})/);
    if (marker && !comment && !frontmatter) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = '';
    }
    if (!fence) {
      if (comment) { if (line.includes(comment)) comment = ''; }
      else if (line.includes('<!--') && !line.includes('-->')) comment = '-->';
      else if ((line.match(/%%/g) || []).length % 2) comment = '%%';
      if (!comment && trimmed === '$$') math = !math;
    }
    if (frontmatter && offset > 0 && /^(---|\.\.\.)$/.test(trimmed)) frontmatter = false;
    if (!trimmed && !fence && !math && !comment && !frontmatter) { flush(offset); start = offset + line.length; }
    offset += line.length;
    if (!fence && !math && !comment && !frontmatter && /^\s*#{1,6}\s/.test(line)) flush(offset);
  }
  flush(offset); return blocks;
}

function mapSpeechBlocks(blocks, chunks) {
  const actual = chunks.map(chunk => compact(typeof chunk === 'string' ? chunk : chunk.text)).join('');
  const candidates = blocks.filter(block => block.speech);
  const ordered = candidates.map(block => block.speech).join('') === actual;
  const counts = new Map();
  for (const block of candidates) counts.set(block.speech, (counts.get(block.speech) || 0) + 1);
  let cursor = 0, searchBudget = 64_000_000;
  const mapped = candidates.flatMap(block => {
    let start = ordered ? cursor : -1;
    // Bound ambiguous-document scans; highlighting must not hold up synthesis.
    if (!ordered && counts.get(block.speech) === 1 && searchBudget >= actual.length) {
      searchBudget -= actual.length; start = uniqueIndex(actual, block.speech);
    }
    if (start < cursor) return [];
    cursor = start + block.speech.length;
    return [{ ...block, start, end: cursor }];
  });
  cursor = 0; let blockIndex = 0;
  return chunks.map(chunk => {
    const start = cursor; cursor += compact(typeof chunk === 'string' ? chunk : chunk.text).length;
    while (blockIndex < mapped.length && mapped[blockIndex].end <= start) blockIndex++;
    const targets = [];
    for (let i = blockIndex; i < mapped.length && mapped[i].start < cursor; i++) if (mapped[i].target) targets.push(mapped[i].target);
    return targets;
  });
}

function markdownHighlightSource(raw, chunks, clean, context) {
  const text = context.sourceText;
  if (typeof text !== 'string') return null;
  const requested = context.sourceOffset;
  let offset = Number.isInteger(requested) && text.slice(requested, requested + raw.length) === raw ? requested : uniqueIndex(text, raw);
  let blocks;
  if (offset >= 0) {
    blocks = markdownBlocks(text).filter(block => block.from < offset + raw.length && block.to > offset).map(block => {
      const from = Math.max(offset, block.from), to = Math.min(offset + raw.length, block.to);
      return { speech: compact(clean(text.slice(from, to))), target: { kind: 'markdown', from, to } };
    });
  } else {
    // Rendered selections may omit Markdown markup; accept only a unique spoken range.
    const all = markdownBlocks(text).map(block => ({ speech: compact(clean(block.text)), target: { kind: 'markdown', from: block.from, to: block.to } }));
    const whole = all.map(block => block.speech).join(''), spoken = chunks.map(compact).join('');
    offset = uniqueIndex(whole, spoken);
    if (offset < 0 || whole !== compact(clean(text))) return null;
    let cursor = 0;
    blocks = all.flatMap(block => {
      const start = cursor; cursor += block.speech.length;
      const from = Math.max(0, offset - start), to = Math.min(block.speech.length, offset + spoken.length - start);
      return to > from ? [{ ...block, speech: block.speech.slice(from, to) }] : [];
    });
  }
  return { kind: 'markdown', text, ranges: mapSpeechBlocks(blocks, chunks) };
}

function pdfHighlightBlocks(pages, clean) {
  return pages.flatMap(page => (page.layout?.lines || []).flatMap((line, index, lines) => {
    if (!line.highlightRect) return [];
    const joined = /[A-Za-z]-$/.test(line.text) && /^[a-z]/.test(lines[index + 1]?.text || '') ? line.text.slice(0, -1) : line.text;
    const speech = compact(clean(preparePdfSpeech(joined, page)));
    // A spoken omission is not an invitation to mark an entire equation.
    if (!speech) return [];
    if (/^(?:[.。]*)(?:Formula|公式)[.。]*$/i.test(speech)) return [{ speech, target: null }];
    return [{ speech, target: { kind: 'pdf', page: page.pageNumber, rect: line.highlightRect } }];
  }));
}

module.exports = { compact, uniqueIndex, markdownBlocks, mapSpeechBlocks, markdownHighlightSource, pdfHighlightBlocks };
