# G02 依赖治理证据

日期：2026-10-04。Issue [#23](https://github.com/gmkits/gmkit/issues/23)。基线 main `c812e244be01c3d3d41c46bb46f8a2e239e46049`。

用户同意在 G01 国内源站部署继续 Blocked 时先推进本项代码和测试；本记录不是生产部署成功或可发布结论。

## 审计范围

原始命令只使用 `https://registry.npmjs.org`，压缩后的机器可读记录在 [npm-audit-summary.json](npm-audit-summary.json)。仅接受 `auditReportVersion=2` 且含 metadata 的响应；第一次网络超时没有被记作成功。

| 范围 | 修改前 | 修改后 |
|:--|:--|:--|
| 整个 workspace | 26（19 high、7 moderate） | 10（4 high、6 moderate） |
| `npm audit -w packages/ts` | 19（16 high、3 moderate） | 0 |

计数为 npm 的受影响依赖节点聚合，不是独立漏洞数量，也不是安全证明。`@noble/curves` / `@noble/hashes` 2.2.0 会被打入 JS 制品，虽然在 devDependencies 中，仍按运行实现对待；本次版本不变。不以 omit-dev 审计结果证明发布包没有风险。

## 本次升级

- ESLint 8.57.1 → 10.12.0，`@eslint/js` 10.0.1，typescript-eslint parser/plugin 7.18.0 → 8.71.0。ESLint 9 在安装核查时已 EOL，未采用为最终版本。
- Vitest / coverage-v8 3.2.7 → 4.1.11，修复 GHSA-82fw-gwwq-j7x9。没有升级到 5，也没有修改算法测试期望。
- shared brace-expansion 更新到各自允许的 1.1.21 / 2.1.7 / 5.0.12；fast-uri 3.1.8、js-yaml 4.3.2、postcss 8.5.28、immutable 5.1.9、undici 7.30.0；nanoid 使用父包允许的已修复版本。
- sucrase 3.35.0 → 3.35.1 使用上游补丁移除 glob 10，不对 glob 强制跨主版本覆盖。
- 共享依赖族的兼容升级也更新了文档/Studio 使用的同名传递节点；未改动这两个 workspace 的直接依赖声明，因此完整复测文档。
- npm 11.3.0 在混合 Vitest peer 解析时报 `edgesOut` 内部异常；使用临时 npm 11.21.0 完成 lock 更新，没有全局安装或修改用户 npm 配置。随后原有 npm 11.3.0 的 `npm ci` 成功。

## 静态检查与兼容

ESLint flat config 保留 eqeqeq、no-undef、unused、局部 require/空 catch 例外，以及旧 no-inner-declarations 行为。独立审查发现最后一项遗漏后，先补失败测试，再显式恢复；回归断言同时校验规则 ID 与 error 级别。ESLint 新推荐集不再启用的 no-extra-semi / no-mixed-spaces-and-tabs 为格式规则，本项明确接受该差异，不以全局关闭正确性规则换取通过。

库 `engines.node >=18.0.0` 不变。源码测试/构建在 Node 22/24；四个消费 job 下载同一个 Node 22 构建的 tarball，不安装 workspace 开发依赖。消费测试检查 ESM/CJS/IIFE、兼容别名、SM2 签名/加解密、SM4 CBC、ZUC 固定输出、空 userId 默认值及无 SM9 导出。

Node 18 ESM 未必有 globalThis.crypto，消费样例显式注入 `node:crypto.randomBytes` 并使用 strict；没有改变库的默认 warn 策略。负向测试使用真实本地 tarball，错误参数、缺失制品、版本错误、公开导出缺失均必须失败。

## 保留告警与后续归属

| 节点 / 版本 | 用途与风险边界 | 后续 |
|:--|:--|:--|
| Vitest / mocker 3.2.7 | Studio 测试工具，路径读取公告；核心已使用独立 4.1.11 | #33 |
| baseline-browser-mapping 2.10.37 | 文档浏览器数据工具，过期数据及审计公告 | #24 |
| browserslist 4.28.2 | 文档 CSS 目标解析；不在 gmkitx 制品内 | #24 |
| DOMPurify 3.4.11 | Studio Markdown 清理、文档 Mermaid 依赖；需分别验证输出与 XSS 边界 | #24 / #33 |
| gray-matter → js-yaml 3.15.0 | 文档 frontmatter 解析，不能靠直接升级 4.x 替代 | #24 |
| markdown-it 14.3.0 | 文档 Markdown 解析 | #24 |
| mermaid 11.15.0 | 文档图表渲染，涉及原型污染、CSS 注入和 DoS 公告 | #24 |
| node-forge 1.4.0 | Studio PKI / RSA 工具，签名校验公告；当前 registry 无修复版本 | #33 |
| smol-toml 1.6.1 | Studio TOML 输入，畸形输入 DoS | #33 |

准确 GHSA 链接、节点路径和 severity 见 JSON。以上没有通过降低 audit-level 或忽略日志隐藏。G02 不宣称这些风险已解决。

剩余安装弃用提示：Studio `curlconverter → yamljs → glob@7.2.3 → inflight@1.0.6`，文档 `cheerio → encoding-sniffer → whatwg-encoding@3.1.1`。核心 sucrase 的 glob 10 提示已用兼容补丁消除。文档 Browserslist/baseline 数据提示继续留在 G03；用户本机 npm `home`、Maven mirror 配置警告不修改用户配置来消除。

## 本地验证

- `npm ci`：成功；没有 `audit fix --force`。
- `npm run verify`：最后一轮代码和依赖修改后成功，TS 667、Java core 297、Java/TS parity、构建和真实包消费。
- `npm run lint -w packages/ts`：源码 lint 和 5 项规则回归成功。
- `npm run test:coverage -w packages/ts`：667 项；statements 89.14%、branches 80.35%、functions 94.37%、lines 89.53%；阈值未降低。Vitest 4 的 AST 覆盖率映射不同，不把分母变化写成算法覆盖回退或提升。
- `npm run test:package-negative -w packages/ts`：3 项本地制品负例成功；最初使用 `.test.mjs` 被 Vitest 误收集，已更名为独立 node:test 脚本并重跑，未放宽 Vitest 发现范围。
- `npm run audit:pack -w packages/ts`：9 文件，约 165.5 KB；消费者只安装 gmkitx，无额外依赖。
- 同一 tarball 在本机 Node 18.20.7 / 20.19.1 / 22.15.1 / 24.1.0 通过；CI 仍需对最终 SHA 实际执行。
- JDK 21 core coverage / animal-sniffer：成功，297 项、0 skipped。
- JDK 8 `-pl gmkit,gmkit-sm9 verify`：成功；SM9 58 项中 26 执行、32 native 条件跳过。跳过不算 SM9 行为证明，本次没有改 JNI/GmSSL。
- Maven dependency:tree：core 的 BC 1.83 为 compile，JSON Schema/JUnit 为 test；SM9 的 BC/JUnit 均为 test。未执行 Maven 漏洞数据库扫描，不据此宣称 Java 零漏洞。
- `npm run docs:verify`：最后一个 sucrase 补丁后完整复验成功，包括多语言示例、TypeDoc/Javadoc、构建、393 页面 / 15451 链接。
- YAML parser 严格检查 CI/Parity 成功，本机无 actionlint；语义与平台执行由远端工作流验证。

独立审查最终确认原 ESLint P2 和测试收集 P1 均已修复，未发现遗留 P0/P1/P2。审查不替代平台运行证据。

第一轮远端 `7140e29` 的 CI/Docs 在旧的 Rollup 二次安装步骤触发 npm `edgesOut` 解析崩溃，并非算法测试失败。锁文件已包含与 Rollup 4.62.2 一致的 linux-x64-gnu 可选包。将五个工作流中相同的二次安装统一改为实际调用 native parser；缺失 binary 时仍硬失败，不再重解依赖树或修改安装图。发布工作流只变更这个验证步骤，不更改触发条件、凭据或发布开关，也没有执行发布。

[草稿 PR #36](https://github.com/gmkits/gmkit/pull/36) 的远端结果必须绑定最终 SHA，并附在 #23 / PR 评论。G01 未恢复的 CN 部署与本项分别记录；不发布 npm/Central、不创建 tag。
