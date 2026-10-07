'use strict';
const { parseDocument } = require('htmlparser2');
const { skipTable, omission } = require('@laginae/note-reader-core');
const MAX_HTML_BYTES = 20 * 1024 * 1024, MAX_HTML_TEXT = 2_000_000, MAX_HTML_NODES = 100_000;
const OMIT = new Set(['head', 'script', 'style', 'template', 'noscript', 'svg', 'canvas', 'iframe', 'object', 'embed', 'audio', 'video', 'nav', 'footer', 'form', 'input', 'button', 'select', 'textarea']);
const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'caption', 'dd', 'details', 'div', 'dl', 'dt', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tr', 'ul']);
const isHtmlFile = (file) => ['html', 'htm'].includes(String(file?.extension).toLowerCase());
const whitespace = (text) => String(text).replace(/\r\n?/g, '\n').replace(/[\t\f\v \u00a0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
function info(node) {
  if (node.nodeType === 3 || node.type === 'text') return { text: node.nodeType === 3 ? node.nodeValue : node.data, children: [] };
  const tag = String(node.localName || node.name || '').toLowerCase();
  const attr = (name) => node.getAttribute ? node.getAttribute(name) : node.attribs?.[name];
  return { tag, children: Array.from(node.childNodes || node.children || []), omit: OMIT.has(tag) || attr('hidden') != null
    || attr('aria-hidden') === 'true' || /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)/i.test(attr('style') || '') };
}
function tableSummary(root, options) {
  const rows = [], stack = [{ node: root }]; let count = 0, caption = '';
  while (stack.length) {
    if (++count > MAX_HTML_NODES) throw new Error('HTML element limit exceeded.');
    const { node, row, cell, inCaption } = stack.pop(), data = info(node);
    if (data.omit) continue;
    if (data.text !== undefined) { if (cell) cell.text += data.text; if (inCaption) caption += data.text; continue; }
    if (data.tag === 'table' && node !== root) return null;
    const nextRow = data.tag === 'tr' ? [] : row;
    if (data.tag === 'tr') rows.push(nextRow);
    const nextCell = ['td', 'th'].includes(data.tag) && nextRow ? { text: '' } : cell;
    if (nextCell !== cell) nextRow.push(nextCell);
    for (const child of [...data.children].reverse()) stack.push({ node: child, row: nextRow, cell: nextCell, inCaption: inCaption || data.tag === 'caption' });
  }
  const values = rows.map((row) => row.map((cell) => cell.text.trim()));
  return values.length && skipTable(values[0], values.slice(1), options)
    ? [caption.trim(), omission('table', options, values.flat().join(' '))].filter(Boolean).join('\n') : null;
}
function extractHtmlTree(root, range = null, options = {}) {
  const pieces = [], headings = [], stack = [{ node: root }]; let count = 0, length = 0, start = null, end = null;
  const append = (text) => { length += text.length; if (length > MAX_HTML_TEXT) throw new Error('HTML text limit exceeded.'); pieces.push(text); };
  const mark = (node, offset) => {
    if (range?.startContainer === node && range.startOffset === offset) start = length;
    if (range?.endContainer === node && range.endOffset === offset) end = length;
  };
  while (stack.length) {
    const action = stack.pop();
    if (action.boundary !== undefined) { mark(action.node, action.boundary); continue; }
    if (action.close) { if (action.heading) action.heading.end = length; if (BLOCK.has(action.tag)) append('\n'); if (['td', 'th'].includes(action.tag)) append('; '); continue; }
    if (++count > MAX_HTML_NODES) throw new Error('HTML element limit exceeded.');
    const data = info(action.node);
    if (data.omit) continue;
    if (!range && data.tag === 'table' && options.academicTableMode) {
      const summary = tableSummary(action.node, options);
      if (summary !== null) { append(`\n${summary}\n`); continue; }
    }
    if (data.text !== undefined) {
      const text = String(data.text || '');
      if (range?.startContainer === action.node) start = length + Math.min(text.length, range.startOffset);
      if (range?.endContainer === action.node) end = length + Math.min(text.length, range.endOffset);
      append(text); continue;
    }
    if (BLOCK.has(data.tag) || data.tag === 'br') append('\n');
    const heading = /^h[1-6]$/.test(data.tag) && headings.length < 2000 ? { start: length, level: Number(data.tag[1]), element: action.node.nodeType === 1 ? action.node : undefined, id: action.node.getAttribute?.('id') || action.node.attribs?.id || '' } : null;
    if (heading) headings.push(heading);
    stack.push({ close: true, tag: data.tag, heading }); stack.push({ node: action.node, boundary: data.children.length });
    for (let i = data.children.length - 1; i >= 0; i--) { stack.push({ node: data.children[i] }); stack.push({ node: action.node, boundary: i }); }
  }
  const raw = pieces.join(''), text = whitespace(raw);
  return { text, headings: headings.map((h) => {
    const title = whitespace(raw.slice(h.start, h.end));
    const offset = text.indexOf(title, whitespace(raw.slice(0, h.start)).length);
    return { title, level: h.level, id: h.id, offset, ...(h.element ? { element: h.element } : {}) };
  }).filter((h) => h.title && h.offset >= 0), selected: start !== null && end > start ? whitespace(raw.slice(start, end)) : '',
    fromSelection: start !== null && end > start ? whitespace(raw.slice(start)) : '' };
}
function extractHtmlText(source, options = {}) {
  if (new TextEncoder().encode(source).byteLength > MAX_HTML_BYTES) throw new Error('HTML exceeds the 20 MiB limit.');
  // A source parser never executes scripts, creates a browsing context or loads external resources.
  return extractHtmlTree(parseDocument(source, { decodeEntities: true }), null, options).text;
}
function htmlReaderDocument(view) {
  try {
    const frame = view?.mainView?.iframe || view?.contentEl?.querySelector?.('#ohpIframe, iframe');
    return frame?.contentDocument || frame?.contentWindow?.document || null;
  } catch { return null; }
}
function captureHtmlSelection(doc) {
  try {
    const selection = doc?.getSelection?.();
    if (!selection?.rangeCount || selection.isCollapsed || !doc.body) return null;
    const range = selection.getRangeAt(0);
    if (!doc.body.contains(range.startContainer) || !doc.body.contains(range.endContainer)) return null;
    const result = extractHtmlTree(doc.body, range);
    return result.selected ? { text: result.selected, htmlFrom: result.fromSelection, pageNumber: 1 } : null;
  } catch { return null; }
}
module.exports = { MAX_HTML_BYTES, isHtmlFile, extractHtmlText, extractHtmlTree, htmlReaderDocument, captureHtmlSelection };

/*!
 * htmlparser2: Copyright 2010, 2011, Chris Winberry <chris@winberry.net>.
 * dom-serializer: Copyright (c) 2014 The cheeriojs contributors.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * domhandler, domelementtype, domutils, entities: Copyright (c) Felix Böhm.
 * All rights reserved. Redistribution and use in source and binary forms, with
 * or without modification, are permitted provided that the following conditions
 * are met: Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer. Redistributions
 * in binary form must reproduce the above copyright notice, this list of
 * conditions and the following disclaimer in the documentation and/or other
 * materials provided with the distribution.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
