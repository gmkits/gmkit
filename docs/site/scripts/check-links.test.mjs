import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const checker = fileURLToPath(new URL('./check-links.mjs', import.meta.url));
async function fixture(files, assertion) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gmkit-doc-links-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      const target = path.join(root, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    const result = spawnSync(process.execPath, [checker, root], { encoding: 'utf8', timeout: 20000 });
    assert.ifError(result.error);
    assertion(result);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('built links: clean URLs, directory indexes and existing fragments resolve offline', async () => {
  await fixture({
    'index.html': '<a href="/guide#intro">Guide</a><a href="/api/">API</a><a href="https://example.invalid/">External</a>',
    'guide.html': '<h1 id="intro">Guide</h1>',
    'api/index.html': '<a href="../guide.html#intro">Guide</a>',
  }, result => assert.equal(result.status, 0, result.stdout + result.stderr));
});

test('built links: unlinked HTML pages are also checked', async () => {
  await fixture({ 'index.html': '<h1>Home</h1>', 'orphan.html': '<a href="/missing">Broken</a>' }, result => {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\/missing/);
  });
});

test('built links: a missing fragment fails even when the document exists', async () => {
  await fixture({ 'index.html': '<a href="/guide#missing">Broken</a>', 'guide.html': '<h1 id="intro">Guide</h1>' }, result => {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /#missing/);
  });
});

test('built links: fragments are checked even when the target was an earlier entry', async () => {
  await fixture({
    'a.html': '<h1 id="intro">Target</h1>',
    'b.html': '<!--' + 'padding '.repeat(50000) + '--><a href="a.html#missing">Broken</a>',
  }, result => {
    assert.notEqual(result.status, 0, result.stdout);
    assert.match(result.stderr, /a\.html#missing/);
  });
});

test('built links: a plain link cannot hide a later fragment on the same target', async () => {
  await fixture({
    'a.html': '<h1 id="intro">Target</h1>',
    'b.html': '<a href="a.html">Target</a><a href="a.html#missing">Broken</a>',
  }, result => {
    assert.notEqual(result.status, 0, result.stdout);
    assert.match(result.stderr, /a\.html#missing/);
  });
});

test('built links: empty build output cannot succeed', async () => {
  await fixture({}, result => {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /No built HTML pages/);
  });
});
