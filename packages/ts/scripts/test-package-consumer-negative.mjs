import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// 此脚本由 node:test 执行，不使用 Vitest 的 *.test.* 文件命名。
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const runner = fileURLToPath(new URL('./test-package-consumer.mjs', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'run via npm run test:package-negative -w packages/ts');

function consume(args) {
  return spawnSync(process.execPath, [runner, ...args], {
    cwd: packageRoot, encoding: 'utf8', timeout: 60000,
  });
}

function assertRejected(result, expectedError) {
  assert.ifError(result.error);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, expectedError);
  assert.doesNotMatch(result.stdout, /package consumer passed/);
}

// 全部使用临时本地制品；不从 registry 下载伪造包，也不修改工作区 manifest。
async function withPackage(overrides, check) {
  const root = await mkdtemp(path.join(tmpdir(), 'gmkit-consumer-negative-'));
  try {
    const source = path.join(root, 'source');
    const packed = path.join(root, 'packed');
    await mkdir(source);
    await mkdir(packed);
    await writeFile(path.join(source, 'package.json'), JSON.stringify({
      name: manifest.name, version: manifest.version, type: 'module', main: './index.js', ...overrides,
    }));
    await writeFile(path.join(source, 'index.js'), 'export default {};');
    const pack = spawnSync(process.execPath, [npmCli, 'pack', '--ignore-scripts', '--pack-destination', packed], {
      cwd: source, encoding: 'utf8', timeout: 60000,
    });
    assert.ifError(pack.error);
    assert.equal(pack.status, 0, pack.stderr);
    const tarballs = (await readdir(packed)).filter((file) => file.endsWith('.tgz'));
    assert.equal(tarballs.length, 1);
    await check(path.join(packed, tarballs[0]));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('无效参数和缺失 tarball 不能误报成功', () => {
  assertRejected(consume(['--tarball']), /usage:/);
  assertRejected(consume(['--tarball', path.join(tmpdir(), 'gmkit-missing', 'absent.tgz')]), /ENOENT|no such file/i);
});

test('拒绝不同版本的真实 tarball', async () => {
  await withPackage({ version: '0.0.0-consumer-negative' }, async (tarball) => {
    assertRejected(consume(['--tarball', tarball]), /does not match the source package name\/version/);
  });
});

test('版本匹配但公开入口缺失时仍失败', async () => {
  await withPackage({}, async (tarball) => {
    assertRejected(consume(['--tarball', tarball]), /does not provide an export/);
  });
});
