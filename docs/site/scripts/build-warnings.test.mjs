import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { handleBuildWarning } from './build-warnings.mjs';

test('Rolldown 性能诊断完整交给默认日志处理，不吞掉报告', () => {
  const warning = { code: 'PLUGIN_TIMINGS', message: 'JavaScript callbacks ran for 3.2s of this 3.5s build (92%).' };
  const reports = [];
  handleBuildWarning(warning, (entry) => reports.push(entry));
  assert.deepEqual(reports, [warning]);
});

test('正确性、插件自报、未知及无代码 warning 一律失败，不按消息子串放行', () => {
  const warnings = ['MISSING_EXPORT', 'UNRESOLVED_IMPORT', 'INVALID_ANNOTATION', 'CIRCULAR_DEPENDENCY', 'PLUGIN_WARNING', 'UNKNOWN', undefined]
    .map((code) => ({ code, message: 'PLUGIN_TIMINGS' }));
  warnings.push({ code: 'PLUGIN_TIMINGS', plugin: 'untrusted', message: 'unexpected' });
  for (const warning of warnings) {
    const reports = [];
    assert.throws(
      () => handleBuildWarning(warning, (entry) => reports.push(entry)),
      { message: `[docs-build] ${warning.code ?? 'WARNING'}: ${warning.message}` },
    );
    assert.deepEqual(reports, [], '拒绝路径不得调用默认处理器');
  }
});

test('默认日志处理器抛错时继续传播，不能伪装成已记录', () => {
  const failure = new Error('logger failed');
  assert.throws(() => handleBuildWarning({ code: 'PLUGIN_TIMINGS', message: 'report' }, () => { throw failure; }), (error) => error === failure);
});

test('VuePress 使用同一受测策略，未关闭检查或设置静默日志', async () => {
  const config = await readFile(new URL('../.vuepress/config.ts', import.meta.url), 'utf8');
  assert.match(config, /onwarn:\s*handleBuildWarning/);
  assert.doesNotMatch(config, /bundlerTimings:\s*false|pluginTimings:\s*false|logLevel:\s*['"]silent/);
});
