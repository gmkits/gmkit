import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const core = require('../package.json');
const version = core.devDependencies.vitest;
// 本轮固定的安全补丁基线；升级工具链时必须审查并同步实际加载版本。
const expectedVite = '7.3.7';
const vitestRequire = createRequire(require.resolve('vitest/package.json'));
const mockerRequire = createRequire(vitestRequire.resolve('@vitest/mocker/package.json'));

test('核心 Vitest、coverage 与 mocker 使用同一锁定补丁', () => {
  assert.equal(require('vitest/package.json').version, version);
  assert.equal(require('@vitest/coverage-v8/package.json').version, version);
  assert.equal(vitestRequire('@vitest/mocker/package.json').version, version);
});

// workspace 顶层 Vite 可能仍被 Studio 固定；检查真实解析路径，不能只看 lock 中存在新版。
test('Vitest 与 mocker 实际加载受约束的 Vite，不回退到其它 workspace 版本', () => {
  assert.equal(vitestRequire('vite/package.json').version, expectedVite, 'Vitest Vite');
  assert.equal(mockerRequire('vite/package.json').version, expectedVite, 'mocker Vite');
});
