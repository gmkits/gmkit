/**
 * 正确性与未知警告阻断构建；Rolldown 自身的性能报告保留原始日志。
 * PLUGIN_TIMINGS 比较插件耗时与 link 耗时，正常 Vue/CSS 编译也会触发，
 * 不能用机器负载相关的比例代替导出、解析或生成内容的正确性检查。
 * 依据：https://rolldown.rs/reference/InputOptions.checks#bundlertimings
 */
export function handleBuildWarning(warning, defaultHandler) {
  if (warning.code === 'PLUGIN_TIMINGS' && !warning.plugin) {
    defaultHandler(warning);
    return;
  }
  throw new Error(`[docs-build] ${warning.code ?? 'WARNING'}: ${warning.message}`);
}
