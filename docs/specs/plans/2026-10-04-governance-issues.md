# GMKit 后续 Issue 推进总表

**目标：** 按 G01 → G11 顺序完成算法、文档和发布前证据治理，每次只推进一个 Issue。
**基线：** `codex/global-algorithm-doc-governance`，初始 HEAD `2895ff5`；2026-10-04 已 fetch，现有 16 个治理提交尚未合并。
**关联设计：** 用户批准的 GMKit 后续 Issue 推进计划；[既有验收记录](../../site/maintenance/release-audit.md)。
**GitHub 总 Issue：** [#21](https://github.com/gmkits/gmkit/issues/21)。GitHub 是状态的主要依据，本表记录顺序、依赖和最近一次同步状态。
**范围：** 本文件属于仓库内部执行记录，不加入 VuePress 导航或发布站点。

**当前执行状态（2026-10-04）：** G01 代码已由 PR #34 合并至 `main` 的 `c812e244be01c3d3d41c46bb46f8a2e239e46049`；合并后算法、Parity、SM9 和文档构建通过，但 CN 源站 SSH 扫描连续两次失败。用户明确同意先推进 G02 代码与测试，G01 保持开放并标为 Blocked；G03-G11 未启动。此次前置例外不改变 G01 关闭标准，失败记录不是已完成验收或可发布结论。

## 执行与关闭规则

1. 每个 Issue 正文包含问题与证据、目标、不包含的工作、实现清单、测试命令、验收条件、依赖和回退方式。
2. 状态为 Backlog → In Progress → 验证/审查 → 合并后验证 → Closed；凭据、网络或权限阻塞如实标记 Blocked，不将跳过算作通过。
3. G01 保留现有分支和全部中文提交；后续从最新 main 建立 `codex/issue-<编号>-<主题>` 分支。每项单独 PR、中文 commit。
4. 修复先补失败测试；独立审查无未解决 P0/P1/P2，且当前 PR SHA 的所有适用检查成功后，普通合并并保留提交。不得使用管理员绕过或修改保护规则。
5. PR 使用 `Refs #编号`，不使用合并即关闭的关键字；相关 main CI/部署成功后，附 run URL、合并 SHA、验证命令与限制，再手动关闭 Issue。
6. GitHub Auto-merge 当前未启用；由执行者检查完整证据后发起合并。没有 required checks 不代表通过。更新总表的文档提交不能替代代码提交的验证证据。
7. 直接阻碍当前验收的问题在当前项内解决；无关问题登记 Backlog。不提前启动下一项，不增加定时任务。2026-10-04 用户仅为 G01 部署阻塞明确授权 G02 代码/测试先行，此例外不放宽验收或自动扩展到 G03。
8. 回退使用普通 revert PR，经相应门禁后合并；不 force-push main、不删除 tag、不覆盖已发布制品。

## 队列

| 顺序 | GitHub Issue | 目标 | 前置 | 最近状态 | PR / 验证 |
|:--|:--|:--|:--|:--|:--|
| G01 | [#22](https://github.com/gmkits/gmkit/issues/22) | 补齐现有治理分支的远端验收并合并 | 现有治理分支 | Blocked：合并后部署 | [PR #34 已合并](https://github.com/gmkits/gmkit/pull/34)；[main Docs attempt 2](https://github.com/gmkits/gmkit/actions/runs/37138805642/attempts/2) 源站连接失败 |
| G02 | [#23](https://github.com/gmkits/gmkit/issues/23) | 治理算法包及测试工具链依赖告警 | G01，用户允许先推进代码测试 | 验证/审查 | [PR #36 草稿](https://github.com/gmkits/gmkit/pull/36)、[实施计划](2026-10-04-g02-core-dependencies.md)；本地通过、审查问题已修复，远端验证中；G01 部署仍未验收 |
| G03 | [#24](https://github.com/gmkits/gmkit/issues/24) | 治理文档工具链依赖与构建警告 | G02 | Backlog | 以对应 Issue 的验收评论为准 |
| G04 | [#25](https://github.com/gmkits/gmkit/issues/25) | 补齐 SM4 共享互操作向量 | G03 | Backlog | 以对应 Issue 的验收评论为准 |
| G05 | [#26](https://github.com/gmkits/gmkit/issues/26) | 补齐 ZUC 非整字节标准向量 | G04 | Backlog | 以对应 Issue 的验收评论为准 |
| G06 | [#27](https://github.com/gmkits/gmkit/issues/27) | 增加算法畸形输入与差分回归 | G05 | Backlog | 以对应 Issue 的验收评论为准 |
| G07 | [#28](https://github.com/gmkits/gmkit/issues/28) | 将 TypeScript API 覆盖检查改为编译器符号分析 | G06 | Backlog | 以对应 Issue 的验收评论为准 |
| G08 | [#29](https://github.com/gmkits/gmkit/issues/29) | 将 Java API 覆盖检查改为 Doclet 成员分析 | G07 | Backlog | 以对应 Issue 的验收评论为准 |
| G09 | [#30](https://github.com/gmkits/gmkit/issues/30) | 将文档布局验收接入浏览器 CI | G08 | Backlog | 以对应 Issue 的验收评论为准 |
| G10 | [#31](https://github.com/gmkits/gmkit/issues/31) | 为历史 API 快照增加来源与摘要验证 | G09 | Backlog | 以对应 Issue 的验收评论为准 |
| G11 | [#32](https://github.com/gmkits/gmkit/issues/32) | 完成生产文档与最终发布前复验 | G10 | Backlog | 以对应 Issue 的验收评论为准 |
| BACKLOG | [#33](https://github.com/gmkits/gmkit/issues/33) | Studio 依赖告警专项 | 另行确认范围 | Backlog | 以对应 Issue 的验收评论为准 |
| BACKLOG | [#35](https://github.com/gmkits/gmkit/issues/35) | 固定 SM9 Linux 构建基线并明确 ABI 支持范围 | 另行确认范围 | Backlog | ubuntu-latest 迁移提示，不作为已确认的算法缺陷 |

## 验收范围

### G01 补齐现有治理分支的远端验收并合并

保留原分支及中文提交，完成远端验收、独立审查、合并后检查。

- [x] 核对干净工作区和 main 基线，登记现有提交及 Issue 总表。
- [x] 推送现有治理分支并建立 Refs 本 Issue 的 PR；核心 CI、parity、Docs 和 SM9 Native 记录 run/SHA。
- [x] 对同一 head SHA 手动执行 publish-java.yml，publish=false，验证五平台构建、单一聚合 JAR、五平台消费。
- [x] 修复直接阻碍合并前验收的代码问题，重跑检查，不通过跳过测试或关闭门禁制造成功；合并后部署阻塞继续跟进。
- [ ] 独立审查无未解决 P0/P1/P2 后按 head SHA 普通合并；等 main 的适用工作流及文档部署成功后关闭。

**关闭条件：** 所有适用工作流成功且绑定最终 head SHA；五平台 native 行为测试不得 skipped；聚合 JAR 恰含五平台十个动态库并能消费；main 相关工作流成功；附 PR、合并 SHA 和 run URL。不以普通 Maven skipped 测试替代 native。

**不包含：** 不提前实施 G02-G11，不改变算法 API；publish=false 不上传 Central。

**中间证据（非最终合并依据）：** `1c34646e26f1bc90d3490ac3a15c6548c0b7dab6` 的 [五平台 SM9](https://github.com/gmkits/gmkit/actions/runs/37136369767) 和 [publish=false 聚合消费](https://github.com/gmkits/gmkit/actions/runs/37136370654) 成功；[Docs](https://github.com/gmkits/gmkit/actions/runs/37136369793) 多语言示例成功，但打包时最高级别压缩触发 PLUGIN_TIMINGS 警告并失败。压缩移至最终站点生成后，保持所有 bundler warning 失败，错误传播及压缩回读由单测验证。最终 SHA 与合并后证据继续记录在 #22，不复用旧 SHA 作为最终通过证明。

**后续诊断：** `08d3492` 的 [Docs](https://github.com/gmkits/gmkit/actions/runs/37137410120) 在移除压缩 hook 后，仅 3.5 秒 Vue/CSS 编译仍触发同一耗时占比提示。因此将 Rolldown 自身 `PLUGIN_TIMINGS` 明确归为可见性能报告，完整交给默认日志；其它和未知 warning 继续失败，禁止按消息文本宽泛过滤。该提交的五平台 native 测试通过，但 [聚合验证](https://github.com/gmkits/gmkit/actions/runs/37137416341) Windows 构建测试出现加密 PEM 导入错误，必须定位修复，不能重跑后忽略。G01 仍未合并，后续 Issue 未启动。

**合并前最终证据：** 候选 `a85b0ebb135ea1ea4e713c526b8290dac1cdd2a2` 的 [CI](https://github.com/gmkits/gmkit/actions/runs/37138442778)、[Parity](https://github.com/gmkits/gmkit/actions/runs/37138442717)、[Docs](https://github.com/gmkits/gmkit/actions/runs/37138442892)、[SM9 Native](https://github.com/gmkits/gmkit/actions/runs/37138442758) 和 [publish=false 聚合 JAR 消费](https://github.com/gmkits/gmkit/actions/runs/37138457431) 全部成功。五平台各 81 项 native 测试、0 跳过，其中 15 项为新增固定标量 PEM 回归。短 INTEGER 的失败先在旧 runtime 复现，再修复 JNI；加密主密钥解析失败误报成功也已拒绝。固定样本属于项目回归，不是国标证明。审查无未解决 P0/P1/P2 后普通合并，未使用管理员绕过。

**合并后证据与阻塞：** `c812e24` 的 [CI](https://github.com/gmkits/gmkit/actions/runs/37138805613)、[Parity](https://github.com/gmkits/gmkit/actions/runs/37138805589)、[SM9 Native](https://github.com/gmkits/gmkit/actions/runs/37138805629) 成功。Docs 的 Verify and build 成功，但 CN 部署在 SSH 公钥扫描阶段约 15 秒后退出，单独重试失败 job 后仍失败。secrets 非空，日志没有指纹不匹配或 SSH 登录拒绝信息；失败发生于 rsync、EdgeOne 刷新及域名验证之前。当前尚不能判断是主机地址、22 端口、SSH 服务还是安全组/网络限制，需要服务器侧确认。不得把旧站点在线或旧 SHA 结果当作本次部署成功。

**恢复条件：** 确认 `docs-production` 使用的 CN 主机地址及 SSH 端口和 Actions 连通性；若地址/端口/指纹确有变化，以可信服务器控制台信息更新配置，不关闭主机身份校验。随后重跑 main Docs，验证 CDN `deployment.json` 为本次 commit 和 www HTTPS 跳转，再关闭 #22、更新本表；#23 已按用户后续许可先推进代码和测试。没有创建版本 tag 或发布 npm/Central。

### G02 治理算法包及测试工具链依赖告警

按依赖族处理核心包和测试工具链告警，保留运行时兼容。

- [x] 保存带日期和版本的审计及依赖路径；区分核心生产、测试/构建、文档、Studio。
- [x] 优先兼容补丁升级；必要的 Vitest 主版本迁移单独中文提交，保留 Node 消费兼容矩阵。
- [x] 不运行 audit fix --force；只更新核心与共享依赖族，不改 Studio/文档直接依赖声明。
- [x] 核对 npm tarball 和 Maven 依赖范围，确保测试库未变成生产依赖。

**当前证据：** [G02 审计和测试记录](../evidence/g02/README.md)。核心 workspace 官方审计 19 → 0，整个 workspace 26 → 10；剩余告警逐项登记到 #24/#33。代码提交 `8db4efc`、`d1f2196`、`6947eff`；远端最终 SHA 验收尚未完成，本项未关闭。

**关闭条件：** 核心相关可修复告警处理完成；剩余告警逐项记录版本、影响面和不修复原因，阻塞性告警未解决不得关闭；Java 8 基线、类型、测试、pack 和消费矩阵通过。

**不包含：** 不将 Studio/node-forge 告警混入算法实现改造，不强行承诺整个 workspace 零漏洞。

### G03 治理文档工具链依赖与构建警告

升级兼容文档依赖并取得全新 CI 文档示例证据。

- [ ] 逐项核对 VuePress、TypeDoc、Vite/Rolldown、浏览器数据库及传递依赖。
- [ ] 保持未知构建 warning 失败；升级与配置迁移分小提交，不过滤错误日志。
- [ ] 全新 CI 实际执行 Node/Java/Go/Python/Rust/Hutool 示例；明确下载失败，不能跳过或关闭 TLS 校验。

**关闭条件：** 完整 docs:verify 在 CI 成功，API 生成、中文覆盖、示例、链接和站点构建通过；新增或剩余告警逐项可解释，无未知构建警告。

**不包含：** 不迁移 VuePress 框架，不改 Studio，不删除第三方集成页面。

### G04 补齐 SM4 共享互操作向量

让 Java/TS 对同一份固定数据和失败案例执行一致验证。

- [ ] 为五种模式补固定 key、IV/nonce、明文、AAD、密文、tag 和显式编码。
- [ ] 从可追溯标准或固定独立实现核验预期，记录 sourceType/sourceRef；项目生成数据仍为 project-fixture。
- [ ] 覆盖空消息、非整块消息、AAD、标签长度及篡改拒绝；两端测试读取共享 JSON。
- [ ] 如发现实现错误，先保存失败向量再修复，不更改正确标准期望来迁就实现。

**关闭条件：** 新增数据通过两端 schema 与计算检查；标准与 fixture 分类准确；有效向量一致、篡改 tag/密文被拒绝；现有公开协议不变。

**不包含：** 不重写 SM4 核心，不以项目自身输出自证标准符合。

### G05 补齐 ZUC 非整字节标准向量

核验原始标准 EIA3 输入、长度与 MAC，覆盖边界而不误标来源。

- [ ] 取得并固定官方来源版本、节号、原始消息、bitLength 和 MAC，包含 577-bit。
- [ ] 测试尾部无效位是否被忽略、有效位篡改、bearer 0/31、direction 0/1 与非法范围。
- [ ] Java/TS 消费同一 JSON，保留原有 project-fixture 分类，不替换其数学输出。

**关闭条件：** 原始标准预期在两端通过；尾部位及参数边界有正反例；sourceRef 可追溯。找不到可信原始数据不得自行标 standard。

**不包含：** 不加入 ZUC-256，不改现有 ZUC-128 API。

### G06 增加算法畸形输入与差分回归

增加可复现、有界的负向测试和独立实现差分。

- [ ] 用现有 Vitest/JUnit 执行共享固定种子样本；PR 每类 200 例，手动深测每类 2000 例。
- [ ] 覆盖 ASN.1 DER 长度/整数编码、SM2 密文布局、公钥、SM4 padding/AEAD tag/nonce、流式分块和 finished/reset 状态。
- [ ] 确定性输出对比独立实现；随机签名/密文验证跨端可验签/解密，不要求随机字节相同。
- [ ] 失败输出 seed 和输入，缩减为固定回归；修复前确认失败，不引入概率性安全断言。

**关闭条件：** 每类 PR/深测样本量可核查，重复 seed 可复现；非法输入真实拒绝且状态边界一致；新增缺陷保留回归，无 flaky 统计阈值。

**不包含：** 不宣称侧信道认证或完整输入空间证明，不为模糊测试放宽校验。

### G07 将 TypeScript API 覆盖检查改为编译器符号分析

由 TypeScript Compiler API 生成准确公共成员清单并与 TypeDoc、手册映射核对。

- [ ] 从公开入口解析符号、alias、namespace、类型、构造器及重载，成员使用限定名称/种类/规范化签名标识。
- [ ] 通过新增成员数据接入 manifest，保留现有字段和统计接口，同步消费者与快照生成。
- [ ] 保留 deprecated 运行时导出与文档；修正文档目录职责和入口描述。
- [ ] 补同名不同成员、重导出、deprecated 别名、缺失重载负例，确保门禁真的失败。

**关闭条件：** 符号清单与生成文档/手册一一匹配；删除一个重载说明或遗漏一个别名有失败测试；原有 manifest 消费者与公开 exports 不变。

**不包含：** 不更改运行时函数签名，不删除兼容别名，不以注释标签存在证明语义正确。

### G08 将 Java API 覆盖检查改为 Doclet 成员分析

使用 JDK 21 Doclet 构建 Java 公共成员及文档说明的检查清单。

- [ ] 通过 Doclet 环境读取公共类型、构造器、字段、方法、重载签名及继承说明。
- [ ] 检查参数、返回值、异常及说明继承，保留 Checkstyle/doclint。
- [ ] 新增缺少公开重载说明的负例；覆盖继承成员、同名类、泛型/数组参数。
- [ ] 保留 manifest 现有字段，增量接入成员清单；文档工具链使用 JDK 21，库仍支持 Java 8。

**关闭条件：** 清单可区分每个公共重载，缺文档负例失败；Javadoc 及中文手册映射通过；Java 8 编译/运行基线不受影响。

**不包含：** 不提升发布库 Java 字节码基线，不把 Doclet 工具打入生产 artifact。

### G09 将文档布局验收接入浏览器 CI

将关键文档布局与导航检查固定为可重复 Playwright 测试。

- [ ] 覆盖首页、指南、TS/Java 手册、TypeDoc/Javadoc 六类页面及 1440/1280/768/390 四种宽度。
- [ ] 检查页面级横向溢出、长签名/代码块内部滚动、移动导航展开折叠和页面异常。
- [ ] 使用受控本地构建服务，启动失败/空页面/控制台异常不能成功；失败上传截图和诊断，始终关闭服务。
- [ ] 接入 docs:verify 和文档 CI，固定浏览器版本安装方式，不依赖本机缓存路径。

**关闭条件：** CI 运行至少 24 组页面/尺寸检查，导航交互通过；注入宽元素的负例能触发失败并产出截图；不以隐藏页面溢出来掩盖布局问题。

**不包含：** 不重做站点主题，不接入 Studio E2E。

### G10 为历史 API 快照增加来源与摘要验证

对历史快照提供来源、工具链及完整性证据。

- [ ] 记录 source commit、生成工具 commit、版本、工具链与文件 SHA-256 清单；清单不包含自身。
- [ ] 快照生成前核对 tag/版本；部署前和远端部署后核对清单与内容。
- [ ] 同版本不同 source commit 拒绝静默覆盖，错误版本/路径和篡改文件必须失败。
- [ ] 历史无清单快照只允许从既有不可变 tag 重建后补录；不能把现有远端页面猜测为可信来源。

**关闭条件：** 错误 tag/version、错误 source commit、缺失/篡改文件都有负例；合法快照和原有版本选择器正常；记录区分源码与生成工具版本。

**不包含：** 不改写现有源码 tag，不将摘要等同发布者签名，不删除历史快照。

### G11 完成生产文档与最终发布前复验

形成最终 SHA 的可发布证据，不执行包发布。

- [ ] 核对总表及所有前置 Issue/PR/测试证据，确认工作区和 main。
- [ ] 验证 CN 源站、EdgeOne 刷新、gmkit.cn deployment.json commit、www HTTPS 规范跳转及历史快照保留。
- [ ] 最终 SHA 重跑核心、完整文档、多语言、Java 基线和 SM9 五平台构建/聚合 JAR 消费；publish=false。
- [ ] 写清发布前结论与剩余风险，所有相关 main 工作流成功后关闭本项与总 Issue。

**关闭条件：** 最终 SHA 的所有适用测试成功；生产 commit 匹配、历史快照和 www 正确；没有未解释的告警或跳过冒充成功；无版本 tag、npm/Central 上传。

**不包含：** 不自动发包，不创建发布标签，不覆盖已经发布的 0.10.1。

### BACKLOG Studio 依赖告警专项

单独登记受影响版本、用途、可达性和修复方案，不混入算法发布。

- [ ] 实际启动本项时重新审计 Studio 依赖及 node-forge 使用点。
- [ ] 分别评估补丁升级、替代实现和功能边界；为修改的工具补测试。

**关闭条件：** 本轮仅建 Backlog，不执行也不标完成；未来获得范围确认后补充精确实现与验收。

**不包含：** 不得为全 workspace 零告警擅自重构 Studio。


## 公共验证命令

核心修改执行：
```bash
npm ci
npm run verify
npm run lint -w packages/ts
npm run audit:pack -w packages/ts
mvn -f packages/java/pom.xml -B -ntp -Pcoverage -pl gmkit verify
```

文档修改执行 `npm run docs:verify`；使用 JDK 21 生成 Javadoc，Java 库仍保留 JDK 8 基线。
G09 起加入正式 Playwright 门禁。第三方 Node/Java/Go/Python/Rust/Hutool 示例必须真实执行；全新环境下载失败不能以跳过掩盖。

SM9 的五平台 native 和聚合 JAR 消费测试由专用 Action 验证。G01、G11 执行 `publish-java.yml` 时显式 `publish=false`，不运行会创建标签的发布入口。

## 保持不变

- 不删除公开算法 API 或 deprecated 别名；空 `userId` 仍使用默认值；RNG 默认 `warn`，`strict` 可选。
- TypeScript 不实现或模拟 SM9；Java 保留 JNI/GmSSL。
- 保留 Go/Python/Rust/Hutool 集成页面，准确说明第三方实现边界。
- Studio 只登记依赖告警 Backlog，不在本轮实施。
- 不创建版本 tag，不发布 npm/Maven 制品。最终验收只形成可发布结论。

## 执行记录

- 2026-10-04：仓库干净，GitHub 授权有效；已查询现有 Issue/PR，没有重复的开放治理条目。
- 2026-10-04：创建总 Issue #21、G01 #22 和 G02 #23；后续创建遇到 GitHub EOF，先查询去重后重试。
- 2026-10-04：使用进程级 HTTP/1.1 重试并查询去重，已建立 G01-G11 #22-#32 和 Studio Backlog #33；仅 G01 进行中。
