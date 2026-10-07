const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
function rule(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `Missing scoped rule: ${selector}`);
  return css.slice(start, css.indexOf('}', start) + 1);
}

// These guard the layout rules; they do not replace an iOS WebView/device test.
test('phone status clearance uses app and browser safe areas only on the active reader pane', () => {
  const text = rule('.is-mobile.is-phone .workspace-leaf-content.note-reader-mobile-docked-view');
  assert.match(text, /padding-top: max\(8px, var\(--safe-area-inset-top, 0px\), env\(safe-area-inset-top, 0px\)\)/);
  assert.match(text, /box-sizing: border-box/);
  assert.match(text, /--view-top-spacing: 0px/);
  assert.match(text, /--view-top-spacing-markdown: 8px/);
  assert.match(text, /--view-top-fade-mask: none/);
});

test('native floating and hidden phone headers participate in layout while the reader is open', () => {
  const text = rule('.is-mobile.is-phone .note-reader-mobile-docked-view > .view-header');
  for (const declaration of ['position: relative', 'inset: auto', 'flex: 0 0 auto', 'margin-top: 0', 'padding-top: 0', 'transform: none', 'opacity: 1']) {
    assert.ok(text.includes(declaration));
  }
  assert.match(rule('.is-mobile.is-phone .note-reader-mobile-docked-view > .view-header::after'), /display: none/);
});

test('iPad layout uses pane container width and supports narrow split windows without phone safe-area overrides', () => {
  assert.match(rule('.note-reader-mobile-docked-view'), /container-type: inline-size/);
  assert.match(css, /@container note-reader-mobile-pane \(min-width: 680px\)/);
  assert.match(css, /@container note-reader-mobile-pane \(max-width: 299px\)/);
  assert.match(rule('.note-reader-mobile-dock .note-reader-mobile-dock-controls'), /44px 44px 44px minmax\(0, 1fr\)/);
  assert.match(rule('.note-reader-mobile-dock .note-reader-mobile-dock-timeline'), /grid-column: 1 \/ -1/);
  assert.doesNotMatch(rule('.note-reader-mobile-docked-view'), /padding-top/);
});

test('tablet button padding and iOS slider size cannot enlarge the compact controls', () => {
  const text = rule('.note-reader-mobile-dock button.note-reader-mobile-icon-button');
  assert.match(text, /width: 44px/);
  assert.match(text, /height: 44px/);
  assert.match(text, /padding: 8px/);
  assert.match(rule('.note-reader-mobile-dock'), /--slider-thumb-width: 12px/);
  assert.match(rule('.note-reader-mobile-dock'), /--slider-thumb-height: 12px/);
});
