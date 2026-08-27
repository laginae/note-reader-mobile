const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const originalLoad = Module._load;
class MockPlugin {}
class MockItemView {}
class MockPluginSettingTab {}
class MockMarkdownView {}
class MockNotice {}
class MockSetting {}
class MockSecretComponent {}

Module._load = function loadWithObsidianMock(request, parent, isMain) {
  if (request === 'obsidian') {
    return {
      ItemView: MockItemView,
      MarkdownView: MockMarkdownView,
      Notice: MockNotice,
      Plugin: MockPlugin,
      PluginSettingTab: MockPluginSettingTab,
      SecretComponent: MockSecretComponent,
      Setting: MockSetting,
      loadPdfJs: async () => ({}),
      requestUrl: async () => ({}),
      setIcon: () => {},
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

let pluginModule;
try {
  pluginModule = require('../main');
} finally {
  Module._load = originalLoad;
}

test('exports an Obsidian plugin and the mobile feedback URL', () => {
  assert.equal(typeof pluginModule.default, 'function');
  assert.equal(Object.getPrototypeOf(pluginModule.default.prototype), MockPlugin.prototype);
  assert.equal(pluginModule.__test.VIEW_TYPE, 'note-reader-mobile-control');
  assert.equal(pluginModule.__test.GITHUB_ISSUES_URL, 'https://github.com/laginae/note-reader-mobile/issues');
});

test('hardware shortcuts ignore text controls', () => {
  assert.equal(pluginModule.__test.isTextInputTarget({ tagName: 'INPUT' }), true);
  assert.equal(pluginModule.__test.isTextInputTarget({ tagName: 'DIV' }), false);
});
