const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.isDesktopOnly, false, 'manifest.json must set isDesktopOnly to false');

const files = fs.readdirSync(path.join(root, 'src'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => path.join(root, 'src', name));
files.push(path.join(root, 'main.js'));

const forbidden = [
  /require\(['"](?:node:)?(?:child_process|crypto|electron|fs|http|https|os|path|url)['"]\)/,
  /\bBuffer\b/,
  /\bprocess\./,
  /\bFileSystemAdapter\b/,
  /\(\?<=[^)]/,
  /\(\?<![^)]/,
];
const failures = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      failures.push(`${path.relative(root, file)} matched ${pattern}`);
    }
  }
}

if (failures.length) {
  throw new Error(`Mobile compatibility check failed:\n${failures.join('\n')}`);
}
console.log(`Mobile compatibility check passed for ${files.length} files.`);
