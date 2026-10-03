import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { brotliDecompressSync, gunzipSync, zstdDecompressSync } from 'node:zlib';
import { compressSite } from './compress-site.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'gmkit-docs-compress-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('最终 HTML 和复制的 API 文件生成三种可逆压缩副本，保留原文件', async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'api'));
  const input = Buffer.from('<p>GMKit 中文 API</p>\n'.repeat(400));
  await writeFile(path.join(root, 'index.html'), input);
  await writeFile(path.join(root, 'api', 'types.json'), input);
  const result = await compressSite(root);
  assert.equal(result.files, 2);
  assert.equal(result.sidecars, 6);
  for (const file of ['index.html', 'api/types.json']) {
    assert.deepEqual(await readFile(path.join(root, file)), input);
    for (const [extension, decode] of [['gz', gunzipSync], ['br', brotliDecompressSync], ['zst', zstdDecompressSync]]) {
      const packed = await readFile(path.join(root, `${file}.${extension}`));
      assert.ok(packed.length < input.length);
      assert.deepEqual(decode(packed), input);
    }
  }
});

test('小文件不压缩，再次运行移除过期副本且不递归压缩 sidecar', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'index.html'), 'test '.repeat(1000));
  await compressSite(root);
  await writeFile(path.join(root, 'index.html'), 'small');
  await writeFile(path.join(root, 'image.png'), Buffer.alloc(4096));
  assert.deepEqual(await compressSite(root), { files: 1, sidecars: 0 });
  assert.deepEqual((await readdir(root)).sort(), ['image.png', 'index.html']);
});

test('构建目录缺失或副本不可写时必须失败', async (t) => {
  const root = await fixture(t);
  await assert.rejects(compressSite(path.join(root, 'missing')), { code: 'ENOENT' });
  await writeFile(path.join(root, 'index.html'), 'test '.repeat(1000));
  await mkdir(path.join(root, 'index.html.gz'));
  await assert.rejects(compressSite(root));
});

test('动态部署/版本清单不压缩，原文件缺失时也移除旧副本', async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'api'));
  for (const file of ['deployment.json', 'api/versions.json']) {
    await writeFile(path.join(root, file), JSON.stringify({ padding: 'x'.repeat(4096) }));
    for (const extension of ['gz', 'br', 'zst']) await writeFile(path.join(root, `${file}.${extension}`), 'stale');
  }
  assert.deepEqual(await compressSite(root), { files: 0, sidecars: 0 });
  assert.deepEqual((await readdir(root)).sort(), ['api', 'deployment.json']);
  assert.deepEqual(await readdir(path.join(root, 'api')), ['versions.json']);
  for (const file of ['deployment.json', 'api/versions.json']) {
    await rm(path.join(root, file));
    for (const extension of ['gz', 'br', 'zst']) await writeFile(path.join(root, `${file}.${extension}`), 'stale');
  }
  assert.deepEqual(await compressSite(root), { files: 0, sidecars: 0 });
  assert.deepEqual(await readdir(root), ['api']);
  assert.deepEqual(await readdir(path.join(root, 'api')), []);
  assert.deepEqual(await compressSite(root), { files: 0, sidecars: 0 });
});

test('压缩在完整站点生成后执行，不占用 bundler hook', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const config = await readFile(new URL('../.vuepress/config.ts', import.meta.url), 'utf8');
  assert.equal(pkg.scripts.postbuild, 'node scripts/compress-site.mjs');
  assert.doesNotMatch(config, /vite-plugin-compression2/);
});
