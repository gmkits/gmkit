import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { ESLint } from 'eslint';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const eslint = new ESLint({ cwd, overrideConfigFile: 'eslint.config.mjs' });

async function lint(code, filePath = 'src/index.ts') {
  const [result] = await eslint.lintText(code, { filePath });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  return result.messages;
}

test('迁移后仍拒绝宽松相等、未声明变量与未使用变量', async () => {
  const messages = await lint('const unused = 1; export const bad = (x: unknown) => x == missing;');
  for (const rule of ['eqeqeq', 'no-undef', '@typescript-eslint/no-unused-vars']) {
    assert.ok(messages.some(({ ruleId, severity }) => ruleId === rule && severity === 2), `missing error rule: ${rule}`);
  }
});

test('下划线参数及 Node/浏览器共同全局有效', async () => {
  assert.deepEqual(await lint('export function f(_ignored: unknown) { return [process.version, new TextEncoder().encode("x")]; }'), []);
});

test('动态 require 与空 catch 例外仅限环境适配文件', async () => {
  const code = 'export function f() { try { return require("node:crypto"); } catch {} }';
  assert.deepEqual(await lint(code, 'src/core/utils.ts'), []);
  const ordinary = await lint(code);
  assert.ok(ordinary.some(({ ruleId, severity }) => ruleId === '@typescript-eslint/no-require-imports' && severity === 2));
  assert.ok(ordinary.some(({ ruleId, severity }) => ruleId === 'no-empty' && severity === 2));
});

test('保留旧版对条件块内函数声明的错误门禁', async () => {
  const messages = await lint('export function f(flag: boolean) { if (flag) { function local() { return 1; } return local(); } return 0; }');
  assert.ok(messages.some(({ ruleId, severity }) => ruleId === 'no-inner-declarations' && severity === 2));
});

test('发布输出不参与源码 lint', async () => {
  assert.equal(await eslint.isPathIgnored('dist/index.js'), true);
  assert.equal(await eslint.isPathIgnored('src/index.ts'), false);
});
