'use strict';
const { parseDocument } = require('htmlparser2');
const { extractHtmlTree, MAX_HTML_BYTES } = require('./html-text');
function markdownOutline(source, cachedHeadings) {
  const lines = source.split('\n'), offsets = []; let offset = 0;
  for (const line of lines) { offsets.push(offset); offset += line.length + 1; }
  let headings = cachedHeadings;
  if (!Array.isArray(headings)) {
    headings = []; let fence = null, frontmatter = lines[0]?.trim() === '---';
    lines.forEach((line, index) => {
      if (frontmatter) { if (index && /^(---|\.\.\.)\s*$/.test(line)) frontmatter = false; return; }
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (marker) { if (!fence) fence = marker[1]; else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null; return; }
      if (fence) return;
      const atx = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (atx) headings.push({ heading: atx[2], level: atx[1].length, position: { start: { line: index } } });
      else if (index && /^ {0,3}(?:=+|-+)\s*$/.test(line) && lines[index - 1].trim()) headings.push({ heading: lines[index - 1].trim(), level: line.trim()[0] === '=' ? 1 : 2, position: { start: { line: index - 1 } } });
    });
  }
  return { kind: 'markdown', source: 'headings', text: source, entries: headings.map((h) => ({ title: h.heading, level: h.level, line: h.position.start.line, offset: offsets[h.position.start.line] })).filter((h) => Number.isInteger(h.offset)) };
}
function htmlOutline(source, options = {}) {
  if (new TextEncoder().encode(source).byteLength > MAX_HTML_BYTES) throw new Error('HTML exceeds the 20 MiB limit.');
  const result = extractHtmlTree(parseDocument(source, { decodeEntities: true }), null, options);
  return { kind: 'html', source: 'headings', text: result.text, entries: result.headings };
}
function sectionText(data, index, remaining) {
  const start = data.entries[index];
  if (!start) throw new Error('Choose a section.');
  const end = remaining ? null : data.entries.slice(index + 1).find((entry) => entry.level <= start.level);
  return data.text.slice(start.offset, end?.offset ?? data.text.length);
}
module.exports = { markdownOutline, htmlOutline, sectionText };
