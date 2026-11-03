import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('offline HTML fallback is limited to navigation requests', async () => {
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

  assert.match(source, /event\.request\.mode === 'navigate'/);
  assert.match(source, /Promise\.reject\(error\)/);
});