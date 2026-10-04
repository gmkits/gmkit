# G02 算法包与测试依赖治理实施计划

> **给代理执行者：** 在本会话内逐项执行，修改后完成独立代码审查。任务使用勾选记录，不以本地成功替代远端验收。

**目标：** 修复 #23 涉及的核心工具链告警，保留公开 API 和 Node 18 消费兼容。
**架构要点：** 算法发布包与构建工具分开验证；只升级核心可达的依赖族，共享传递依赖使用兼容版本，不顺带升级文档和 Studio 的直接依赖。
**技术栈：** TypeScript、ESLint flat config、Vitest、npm workspace、Maven/JDK 8/21。
**关联设计文档：** [治理总表](2026-10-04-governance-issues.md)，GitHub #23。

## 执行边界

- 分支 `codex/issue-23-core-dependencies`，包含先前 G01 状态记录提交 `14733fe`，算法基线为 main `c812e24`。
- 2026-10-04 用户明确同意先推进 G02 代码与测试，G01 继续开放等待国内源站 SSH 恢复。这不是生产部署通过或 G01 关闭。
- 官方 registry 基线：整个 workspace 26 项（19 high / 7 moderate）；`-w packages/ts` 为 19 项（16 high / 3 moderate）。npm 计数包含传递影响链，不等于独立漏洞数量。
- `@noble/curves`、`@noble/hashes` 虽声明为 devDependencies，但会打进 JS 制品，按发布实现对待；不以 `--omit=dev` 的结果声称算法零风险。
- `vitest@3.2.7` 命中 GHSA-82fw-gwwq-j7x9，4.1.11 为已确认修复版本。测试工具提升不改变库的 Node >=18 engines。

## 任务 1：审计与 ESLint 迁移

涉及 `packages/ts/package.json`、`packages/ts/.eslintrc.cjs`、新建 `packages/ts/eslint.config.mjs`、`packages/ts/scripts/test-lint-config.mjs`、根 `package-lock.json`。

- [x] 从官方 registry 保存原始审计到临时证据文件；记录网络失败，成功重试后才采纳报告。
- [x] 增加 lint 配置回归：非法宽松相等、未声明变量、未使用变量必须报错；下划线参数和 utils 的 require 兼容例外必须有效；普通源文件不能绕过 require 规则。
- [x] 先运行 `node --test packages/ts/scripts/test-lint-config.mjs`，确认缺少 flat config 时失败。
- [x] 将 ESLint 升为 10.12.0、parser/plugin 同步为 8.71.0，引入 `@eslint/js` 10.0.1 和 `globals`；用 `js.configs.recommended` 与插件 flat/recommended 配置，保留 eqeqeq、下划线例外和 utils 的局部例外。安装核查发现 ESLint 9 已于 2026-08-06 停止支持，因此不把 9 作为最终版本。
- [x] 删除旧 `.eslintrc.cjs`；执行 lint 配置测试与 `npm run lint -w packages/ts`，不得通过全局禁用规则消除失败。
- [x] 提交 `8db4efc`；独立审查后 `d1f2196` 补回 no-inner-declarations，并断言 error 级别。

回归核心断言：
```js
assert.ok(messages.some(({ ruleId }) => ruleId === 'eqeqeq'));
assert.ok(messages.some(({ ruleId }) => ruleId === 'no-undef'));
assert.equal(allowedMessages.length, 0);
```

## 任务 2：Vitest 与构建依赖

涉及 `packages/ts/package.json`、根 `package-lock.json`、`.github/workflows/ci.yml`；按实际升级迁移 `packages/ts/vitest.config.ts`，不降低现有覆盖率阈值。

- [x] Vitest 与 coverage-v8 精确同步升级 4.1.11；核心 Node 环境不引入 DOM 测试。
- [x] 按审计路径兼容更新 brace-expansion、fast-uri、js-yaml、nanoid、postcss 等实际核心可达传递依赖；核对 lock 差异，文档/Studio 独享依赖留到 #24/#33。
- [x] CI 用 Node 22/24 跑源码测试、lint 和 coverage；构建一次真实 tarball，再由独立 Node 18/20/22/24 job 安装并消费，旧 Node 不安装新的开发工具链。
- [x] 消费回归保持 ESM/CJS/IIFE、deprecated 别名和 SM2 密钥生成；测试依赖不能随制品安装。
- [x] 运行 type-check、667 项既有测试、coverage、build、pack、包消费；保留所有既有算法测试。
- [x] 单独提交 `6947eff`；新增 3 项真实本地 tarball 负例，CLI/包身份/公开入口错误不得报成功。

## 任务 3：最终证据与审查

涉及本文件、治理总表、`docs/specs/evidence/g02/` 审计摘要及测试记录。

- [x] `npm ci` 后运行 `npm run verify`、`npm run lint -w packages/ts`、`npm run audit:pack -w packages/ts`。
- [x] JDK 21 执行 `mvn -f packages/java/pom.xml -B -ntp -Pcoverage -pl gmkit verify`；JDK 8 执行 `mvn -f packages/java/pom.xml -B -ntp -pl gmkit,gmkit-sm9 verify`。普通 native skipped 如实记录，不作为 SM9 执行证据。
- [x] 核对 Maven compile/test 依赖树；测试 BC/JUnit 不进入 SM9 生产依赖。Java 依赖未修改不声称完成 Maven 漏洞数据库扫描。
- [x] 新审计逐项记录剩余告警、版本、路径、用途与所属 Issue；见 [审计与测试证据](../evidence/g02/README.md)。
- [x] 最后一个 sucrase 补丁后重新执行 `npm run docs:verify`：多语言示例真实通过，393 页面 / 15451 链接通过。
- [ ] 独立审查无 P0/P1/P2 后提交中文证据 commit、PR `Refs #23`；远端适用检查必须绑定最终 SHA。
- [ ] G01 生产部署未恢复前不关闭 G01，不将旧部署错误算为成功；G02 合并/关闭另行核对适用检查，不自动跳到 G03。

## 官方参考

- [ESLint v9 迁移](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [typescript-eslint 依赖兼容范围](https://typescript-eslint.io/users/dependency-versions/)
- [Vitest mocker 公告](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)

回退使用独立 revert PR；不 force-push、不创建 release tag、不发布制品。
