# G02 恢复验证记录（2026-10-24）

## 状态与范围

计划修订提交 `eee5877`，基于 PR #36 的 `24e9198`；本轮尚未完成代码验收，未合并或发布。G01 生产部署仍开放，不能用本地文档构建代替 CN/EdgeOne 验收。

独立计划审查发现 G02/G03 前置描述歧义（P2）；已明确为 G02 关闭后进入 G03，G01 独立保留直至生产验收。复核无遗留 P1/P2。这不代表依赖补丁已通过独立代码审查。

## 新审计

使用官方 registry 完整 JSON 响应，`npm audit` 返回 1（发现告警），不是成功无告警：

| 范围 | 10 月 24 日补丁前 |
|:--|:--|
| `npm audit -w packages/ts` | 7：3 high、4 moderate |
| 全 workspace | 22：3 critical、10 high、5 moderate、4 low |

这些是 npm 聚合依赖节点数，不是独立漏洞数，也不直接等同已发布算法包的可利用性。机器记录见 [audit-2026-10-24.json](audit-2026-10-24.json)。10 月 4 日的 0/10 仅保留为历史结果。

已准备但未提交的补丁：Vitest/coverage/mocker 4.1.12、fast-uri 3.1.9、source-map-js 1.2.2、undici 7.30.1。参考 [Vitest 公告](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8)和 [Windows 路径修复](https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp)。

**未解决项：** Studio 精确固定 Vite 7.3.6，并被共享 mocker 加载。只约束 Vitest 到 7.3.7 后，`createRequire` 仍确认 mocker 使用 7.3.6；新路径回归稳定失败，不能宣称修复。已询问是否允许仅将 Studio 的 Vite 补丁升级到 7.3.7，并运行其类型/构建，不改工具功能。决定前不合并 G02。

首次定向 `npm update vite` 连带将文档 Vite 8.0.16 升到 8.3.5；该未提交锁变更已撤回。当前保留的锁差异限于核心补丁和试验性隔离解析，不采用无关文档升级。未使用 `audit fix --force`，未修改用户全局 npm 配置。

全库 critical 聚合涉及 DOMPurify、Studio tinypool 以及其传递影响；分别交 #24/#33 评估具体使用模式与公告前置条件，不将依赖命中直接写成网站已被利用。

## 本轮执行结果

- 初始 `npm ci` 成功；基线 `npm run verify` 成功，TS 667、Java core 299、Parity、构建及包消费通过。此结果早于本轮依赖补丁，不能复用为补丁最终验收。
- `npm run lint -w packages/ts`：通过，5 项 lint 规则回归及源码检查。
- JDK 21 `-Pcoverage -pl gmkit verify`：299 项通过，coverage 和 Java 8 API 检查通过。
- JDK 8 `-pl gmkit,gmkit-sm9 verify`：通过。SM9 58 项中 32 项 native 条件跳过；不是 SM9 行为成功证据。
- `npm run docs:verify`：当前未提交补丁工作区通过，包含 19 组示例、393 HTML 页面和 15451 次链接检查。待最终锁文件稳定后仍须重跑远端检查。
- 新 `test:toolchain`：预期失败，mocker 的实际 Vite 为 7.3.6，而要求 7.3.7。该红灯不能删除或改成跳过来使 G02 通过。
- 三份计划的本地 Markdown 链接检查通过（8 个），`git diff --check` 通过。

## 完成前仍需执行

确定共享 Vite 修复范围，完成红绿回归及独立代码审查，使用最终锁文件重新 `npm ci` 和完整公共门禁；将最终 head 的 PR/push CI、Parity、Docs 结果记入 #23。任何中间成功不覆盖上述未解决项，准确 SHA 未获合并确认前不执行合并。
