# GMKit 治理恢复推进实施计划

> **给代理执行者：** 本会话按步骤执行，计划修订与实现分别审查。未达到当前 Issue 的验收条件，不启动下一代码 Issue。

**目标：** 落实已批准的六项审查修订，恢复 G02 验收，保留真实部署和发布边界。
**架构要点：** GitHub 为状态主源，仓库总表保留依赖和验证规则；代码验收与外部部署拆开，最终发布仍同时要求两者通过。API 文档覆盖、旧消费者兼容和安全公告审计分别提供证据。
**技术栈：** Markdown、GitHub CLI、npm workspace、Vitest/ESLint、Maven/JDK 8/21、现有 Actions。
**关联设计文档：** [治理总表](2026-10-04-governance-issues.md)；用户 2026-10-24 确认按六项审查建议逐步执行并复核。

## 文件与职责

- `docs/specs/plans/2026-10-04-governance-issues.md`：顺序、关闭标准、证据时效与六项修订的责任归属。
- `docs/specs/plans/2026-10-04-g02-core-dependencies.md`：区分历史完成项与本次恢复验证。
- 本文件：本轮可执行步骤与状态；不加入站点导航。
- `docs/specs/evidence/g02/2026-10-24-revalidation.md`：本轮命令、审计及审查结果，不覆盖旧证据。
- `docs/specs/evidence/g02/2026-10-25-revalidation.md`：共享 Vite 补丁获准后的最终本地复验；机器记录为同目录 `audit-2026-10-25.json`。
- GitHub #21/#22/#23/#24/#25/#27/#28/#29/#32/#35 与 PR #36：更新现有正文，保留问题证据与失败历史，不重建同名 Issue。

## 步骤 1：核对状态并修订计划

- [x] `git status -sb`、`git fetch origin`、读取 PR #36/总 Issue，确认分支为 `codex/issue-23-core-dependencies`，无用户未提交修改；main 为 `c812e24`。
- [x] 总表改为代码 Issue 串行、G01 外部部署独立；#35 插入 G03 与 G04 之间，G11 依赖 G01 与 #35。
- [x] 补齐旧消费者、Maven/native 公告、安全边界与差分测试资源上限；保留 API、userId 默认值和 RNG warn。
- [x] 只读独立审查完成，发现 G03 前置描述歧义（P2）并已拆句修正；无其它 P1/P2。该审查不代表依赖补丁已通过代码审查。

计划修订不虚构算法失败测试；以精确 diff、有效链接、依赖无环和检查清单审查验收。

## 步骤 2：同步既有 Issue

- [x] 使用 `gh api repos/gmkits/gmkit/issues/<number>` 读取最新正文，保留已有证据。
- [x] 更新 #21 顺序、#22 外部阻塞范围、#23 合并/关闭条件、#24 前后依赖、#25 前置 #35；#35 不再是 Backlog。
- [x] 将测试资源/对照规则写入 #27，旧消费者写入 #28/#29，依赖公告与 artifact 保留写入 #32；对应 Issue 仍为未实施，不勾选实现完成。
- [x] 回读每个正文，核对变更与总表一致；不关闭任何 Issue，不修改保护、密钥、域名或自动合并设置。

## 步骤 3：复验 G02

使用当前 Node 及 JDK 21，安装和测试串行执行，日志放系统临时目录，摘要进入证据文件。

```text
npm ci
npm audit -w packages/ts --registry=https://registry.npmjs.org --json
npm audit --registry=https://registry.npmjs.org --json
npm run verify
npm run lint -w packages/ts
npm run audit:pack -w packages/ts
mvn -f packages/java/pom.xml -B -ntp -Pcoverage -pl gmkit verify
npm run docs:verify
```

- [x] 核对所有命令退出码。核心 audit 为 0；全 workspace 18 个告警节点，退出 1，完整 JSON 已保存。功能、文档、coverage、pack 验证均通过。
- [x] 核心可达新增告警已处理；用户批准 Studio 共享 Vite 7.3.7 补丁，类型/构建及 11 项测试通过；其它文档/Studio 告警保留 #24/#33。G02 不声称已完成 G11 的 Maven/native 全量公告复核。
- [x] JDK 8 执行 `mvn -f packages/java/pom.xml -B -ntp -pl gmkit,gmkit-sm9 verify`；58 项 SM9 中 32 项 native skipped 如实记录，不能算 SM9 运行证明。
- [x] 单独复核分支相对 main 的包内容、兼容别名、默认值、lint 级别、CI 工具链/消费分离及 SM2 修复。本轮真实依赖路径测试先红后绿，未发现新增 P0/P1/P2；不冒充第三方批准。

## 步骤 4：提交、远端复验与合并检查点

- [ ] `git diff --check`；显式暂存计划与证据，中文 commit，普通 push；不改写旧提交。
- [ ] 回读 PR 当前 SHA，运行 PR watcher，核对 PR/push CI、Parity 和 PR Docs 均属于最终 head；有失败继续本 Issue，不跳过、不盲目重跑。
- [ ] 检查最新审查意见与准确 head；满足门禁后才移出 draft，并展示 PR/SHA/合并策略取得本次合并确认。仓库策略或工具不支持时明确阻塞，不绕过。
- [ ] 获准且合并成功后记录 main SHA，等待相关 main CI/Parity/Docs build；仅 G01 已确认的同一外部部署故障可单独保留，新的回归不能豁免。
- [ ] 更新 #23 验收证据并关闭后进入 G03。G01 不关闭，G11 不得绕过生产部署、最低 ABI 和依赖风险验收。

## 回退与边界

计划修订通过普通提交回退；代码回归使用独立 revert PR。无论验证是否通过，都不创建版本 tag、不发布 npm/Central、不恢复已失效 HK 源站；保留国内源站、gmkit.cn 与 www HTTPS 跳转要求。
