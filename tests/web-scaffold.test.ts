import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('browser entry provides the app mount and Vite module entry', () => {
  assert.equal(existsSync('index.html'), true, 'index.html is required');
  assert.equal(existsSync('vite.config.ts'), true, 'vite.config.ts is required');
  assert.equal(existsSync('src/web/main.tsx'), true, 'React entry is required');

  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /id="root"/);
  assert.match(html, /src="\/src\/web\/main\.tsx"/);
});
