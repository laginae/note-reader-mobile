const test = require('node:test');
const assert = require('node:assert/strict');
const { alignPreviewHeading, locateMarkdownPreview } = require('../src/outline-navigation');

function fixture({ top = 198, dockBottom = top, headingTop = 96, height = 30, line = 8, offset = 120 } = {}) {
  const rect = (top, bottom) => ({ top, bottom, height: bottom - top, left: 0, right: 440 });
  const heading = { isConnected: true, getBoundingClientRect: () => rect(headingTop, headingTop + height) };
  const scroll = { scrollTop: 502, contains: (el) => el === heading, getBoundingClientRect: () => rect(top, 820) };
  const section = { start: { line, offset }, el: { querySelector: () => heading } };
  const calls = [];
  const view = {
    getMode: () => 'preview',
    containerEl: { getBoundingClientRect: () => rect(0, 820), querySelector: () => ({ getBoundingClientRect: () => rect(0, dockBottom) }) },
    previewMode: { applyScroll: (line) => calls.push(line), renderer: { previewEl: scroll, sections: [section] } },
  };
  const leaf = { view, setEphemeralState: () => { throw Error('Preview should use line navigation'); } };
  return { leaf, view, scroll, heading, section, calls, entry: { line, offset, title: 'Public example' } };
}

test('a heading hidden above the mobile toolbar is aligned below the actual content top', () => {
  const f = fixture();
  assert.equal(alignPreviewHeading(f.view, f.entry), true);
  assert.equal(f.scroll.scrollTop, 388);
});

test('alignment handles tablet layouts, wrapped headings and an overlapping dock', () => {
  for (const top of [0, 80, 160, 198, 260]) {
    const f = fixture({ top, dockBottom: top + 40, height: 90, headingTop: 600 });
    assert.equal(alignPreviewHeading(f.view, f.entry), true);
    assert.equal(f.scroll.scrollTop, 502 + 600 - top - 40 - 12);
  }
});

test('source line and offset distinguish duplicates and stale anchors without title guessing', () => {
  const f = fixture();
  f.view.previewMode.renderer.sections.unshift({ start: { line: 0, offset: 0 }, el: { querySelector: () => ({}) } });
  assert.equal(alignPreviewHeading(f.view, f.entry), true);
  f.scroll.scrollTop = 502;
  assert.equal(alignPreviewHeading(f.view, { ...f.entry, offset: 121 }), false);
  assert.equal(f.scroll.scrollTop, 502);
});

test('missing, disconnected, hidden or out-of-view headings are not guessed', () => {
  for (const change of [
    f => { f.view.previewMode.renderer.sections = []; },
    f => { f.heading.isConnected = false; },
    f => { f.scroll.contains = () => false; },
    f => { f.heading.getBoundingClientRect = () => ({ top: 0, height: 0 }); },
  ]) {
    const f = fixture(); change(f);
    assert.equal(alignPreviewHeading(f.view, f.entry), false);
    assert.equal(f.scroll.scrollTop, 502);
  }
});

test('preview navigation settles before alignment and retains its source line', async () => {
  const f = fixture();
  assert.equal(await locateMarkdownPreview(f.leaf, f.entry, () => true), true);
  assert.deepEqual(f.calls, [8]); assert.equal(f.scroll.scrollTop, 388);
});

test('cancelled navigation cannot scroll a document after the outline closes or view changes', async () => {
  for (const change of [f => { f.current = false; }, f => { f.view.getMode = () => 'source'; }, f => { f.leaf.view = {}; }]) {
    const f = fixture(); f.current = true;
    const pending = locateMarkdownPreview(f.leaf, f.entry, () => f.current);
    change(f);
    await assert.rejects(pending, /cancelled/);
    assert.equal(f.scroll.scrollTop, 502);
  }
});

test('older preview APIs retain native navigation without requiring renderer internals', async () => {
  let state;
  assert.equal(await locateMarkdownPreview({ view: {}, setEphemeralState: v => { state = v; } }, { line: 2 }, () => true), true);
  assert.deepEqual(state, { line: 2 });
  assert.equal(await locateMarkdownPreview({ view: {} }, { line: 2 }, () => true), false);
});
