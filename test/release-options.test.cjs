'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { normalizeSettings, DEFAULT_SETTINGS } = require('../src/config');
test('new mobile math and floating preferences normalize safely and preserve opt-in defaults', () => {
  const value = normalizeSettings({ academicFunctionStyle: 'compact', academicIntervalStyle: 'range', floatingSpeedButtons: true, floatingRightClickVolume: true });
  assert.equal(value.academicFunctionStyle, 'compact'); assert.equal(value.academicIntervalStyle, 'range');
  assert.equal(value.floatingSpeedButtons, true); assert.equal(value.floatingRightClickVolume, true);
  assert.equal(DEFAULT_SETTINGS.academicFunctionStyle, 'auto'); assert.equal(DEFAULT_SETTINGS.academicIntervalStyle, 'natural');
  assert.equal(DEFAULT_SETTINGS.floatingSpeedButtons, false); assert.equal(DEFAULT_SETTINGS.floatingRightClickVolume, false);
  const invalid = normalizeSettings({ academicFunctionStyle: 'invalid', academicIntervalStyle: 'invalid', floatingSpeedButtons: 'true', floatingRightClickVolume: 1 });
  assert.equal(invalid.academicFunctionStyle, 'of'); assert.equal(invalid.academicIntervalStyle, 'precise');
  assert.equal(invalid.floatingSpeedButtons, false); assert.equal(invalid.floatingRightClickVolume, false);
});

test('new installs use everyday headers while saved preferences keep their original defaults', () => {
  assert.equal(DEFAULT_SETTINGS.academicTableRepeatHeaders, false); assert.equal(normalizeSettings(null).readingProfile, 'everyday');
  assert.equal(normalizeSettings({ academicTableRepeatHeaders: false }).academicTableRepeatHeaders, false);
  for (const value of [undefined, null, 'false', 0, true]) assert.equal(normalizeSettings({ academicTableRepeatHeaders: value }).academicTableRepeatHeaders, true);
});
