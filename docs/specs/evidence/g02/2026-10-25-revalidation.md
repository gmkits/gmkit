# G02 补丁复验（2026-10-25）

关联 [Issue #23](https://github.com/gmkits/gmkit/issues/23)、[PR #36](https://github.com/gmkits/gmkit/pull/36)。代码提交：`f7aa88b6d7054eaa721d8069a5693754fb347fee`，基线 main：`c812e244be01c3d3d41c46bb46f8a2e239e46049`。本记录证明本地复验，不替代最终 head 的远端检查、合并确认或生产部署。

## 批准范围与实现

- 用户确认只将 Studio 的共享 Vite 7.3.6 升到 7.3.7，并验证类型和构建；没有修改 Studio 工具功能。Studio 其它依赖仍属于 #33。
- 核心 Vitest、coverage、mocker 从 4.1.11 更新到 4.1.12；锁文件包含兼容补丁 fast-uri 3.1.9、source-map-js 1.2.2、undici 7.30.1。
- 移除试验性 overrides。文档专用 Vite 仍为 8.0.16，没有连带迁移到 8.3.5。
- 新 `test:toolchain` 通过各自的 `createRequire` 核验 Vitest 和 mocker 真正加载的 Vite，而非只检查 lock 中存在新版。补丁前稳定失败于 mocker 的 7.3.6，补丁后 2/2 通过；该检查接入 `npm test`，不进入发布包。
- 使用 npm 11.21.0 临时 CLI 生成锁文件，使用本机 npm 11.3.0 完成全新 `npm ci`。未使用 `audit fix --force`，未修改全局 npm 配置。

## 官方 Registry 审计

机器记录见 [audit-2026-10-25.json](audit-2026-10-25.json)，含代码 SHA、锁文件 SHA-256、实际依赖路径、版本和公告 URL。只接受完整 `auditReportVersion=2` 且含 metadata 的响应。

| 范围 | 10 月 24 日补丁前 | 10 月 25 日补丁后 | 退出码 |
|:--|:--|:--|:--|
| 核心 workspace，包含开发依赖 | 7 | 0 | 0 |
| 全 workspace | 22 | 18：3 critical、8 high、3 moderate、4 low | 1 |

计数是 npm 聚合依赖节点，不是独立漏洞数。发布包中的 noble 实现即使列在 devDependencies 也不能免审；本次没有修改 noble 版本。不把核心审计为 0 写成算法安全证明、全 workspace 零告警或 Maven/native 公告扫描完成。

剩余 Vite 命中位于 `node_modules/@vuepress/bundler-vite/node_modules/vite`（8.0.16），属于 #24；旧 mocker/Vitest/tinypool 位于 Studio，属于 #33。Vue、DOMPurify 等可能由文档和 Studio 共享，分别在 #24/#33 评估使用路径、公告前置条件和升级影响，不因本轮核心验证成功而关闭。

## 本地验证

环境：Windows x64，Node 24.1.0，npm 11.3.0；文档和 coverage 使用 JDK 21.0.7，Java 8 基线使用 Temurin 8u492。

| 命令 | 结果 |
|:--|:--|
| `npm ci` | 通过，977 packages |
| `npm run test:toolchain -w packages/ts` | 2 项通过，补丁前有红灯证据 |
| `npm run verify` | 通过：TS 667 项、Java core 299 项、Java parity 133 项、TS parity 129 项、构建与 Node 24 真 tarball 消费 |
| `npm run lint -w packages/ts` | 5 项配置回归和源码 lint 通过 |
| `npm run test:coverage -w packages/ts` | 667 项通过；语句 89.14%、分支 80.35%、函数 94.37%、行 89.53%，阈值未降低 |
| `npm run test:package-negative -w packages/ts` | 3 项通过，参数、版本、缺失导出均拒绝 |
| `npm run audit:pack -w packages/ts` | 9 文件，165.51 KB 压缩包；无生产依赖及测试脚本 |
| `npm run build -w apps/gmkit-studio` | `vue-tsc --noEmit` 和 Vite 7.3.7 构建通过 |
| `npm run test:unit -w apps/gmkit-studio` | 11 项通过 |
| `npm run docs:verify` | API/部署契约、19 组多语言示例、构建、393 HTML / 15451 链接通过 |
| JDK 21 `mvn -f packages/java/pom.xml -B -ntp -Pcoverage -pl gmkit verify` | 299 项、JaCoCo、Java 8 API 检查通过 |
| JDK 8 `mvn -f packages/java/pom.xml -B -ntp -pl gmkit,gmkit-sm9 verify` | 通过；SM9 58 项中 32 项 native 条件跳过，不是 native 成功证据 |

本地日志保存于系统临时目录，前缀 `gmkit-g02-20261025-`。远端 Node 18/20/22/24 制品消费和 JDK 矩阵须在最终 head 重新验证；不能用历史 run 或本地 Node 24 结果代替。

## 提交前审查与剩余限制

单独复核了分支相对 main 的算法、lint、锁文件、包消费及工作流差异，并重新审查本轮四个代码文件，未发现新增 P0/P1/P2。该结论是本会话的提交前审查，不冒充新的第三方批准。公开导出、deprecated 别名、空 userId 默认值和 RNG warn 未改变；此前 SM2 无前缀 C1 首字节歧义的修复仍保留固定回归与 C3 篡改拒绝。

没有将 warnings 静默化：Studio 构建仍报告 web-tree-sitter 的 fs/path 外部化、eval 和大 chunk；文档仍提示浏览器数据库过期。分别留 #33/#24，不宣称构建日志无警告。npm home 配置和 Maven 用户 settings 警告未擅自修改。

G01 的 CN SSH 部署仍未验收。本轮未运行五平台 native/聚合 JAR 发布验证，不复用普通 Maven skipped 作为 native 证据。未创建版本标签、未发布 npm/Central。PR 当前 SHA 的适用检查和本次合并确认完成前不合并，合并后 main 相关测试/构建成功前不关闭 #23。
