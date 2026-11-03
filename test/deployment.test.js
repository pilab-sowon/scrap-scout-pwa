import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('public assets and PWA scope work from a GitHub Pages subpath', async () => {
  const [html, app, serviceWorker, manifest] = await Promise.all([
    read('../public/index.html'),
    read('../public/app.js'),
    read('../public/sw.js'),
    read('../public/manifest.webmanifest'),
  ]);

  assert.doesNotMatch(html, /(?:href|src)="\//);
  assert.match(app, /register\('\.\/sw\.js'\)/);
  assert.doesNotMatch(serviceWorker, /['"]\/(?:index|styles|app|calculator|manifest|icons)/);

  const parsedManifest = JSON.parse(manifest);
  assert.equal(parsedManifest.start_url, './');
  assert.equal(parsedManifest.scope, './');
  assert.ok(parsedManifest.icons.every((icon) => icon.src.startsWith('./')));
});
