---
title: 发布内容审计
description: 在发布前审计 npm 与 Maven 制品内容、文档、许可证、来源和供应链边界。
icon: checklist
order: 10
category: [项目维护, 发布]
tag: [npm pack, 文档审计, 供应链]
---

# 发布内容审计

本页是每次 TypeScript 与文档发布前可重复执行的检查表。目标是验证产物最小、内容准确和示例可复现，而不是通过删除有价值页面降低维护成本。

## 自动门禁

```bash
npm run type-check -w packages/ts
npm test -w packages/ts
npm run lint -w packages/ts
npm run build -w packages/ts
npm run audit:pack -w packages/ts
npm run test:package -w packages/ts
npm run parity
npm run docs:verify
mvn -f packages/java/pom.xml -B -ntp -Pcoverage -pl gmkit verify
```

| 门禁 | 主要失败含义 |
|:--|:--|
| type-check/lint | 公共类型或源码约束被破坏 |
| 单测/parity | 算法、边界或跨语言协议回归 |
| build | ESM/CJS/IIFE/类型产物失败或出现未知警告 |
| pack 审计 | tarball 文件、体积或 source map 策略异常 |
| tarball 消费 | 临时安装后的 ESM/CJS/IIFE、exports 或兼容别名异常 |
| docs check | 链接、导航、API、版本或 fixture 依赖声明漂移 |
| docs examples | Node/Go/Python/Rust/Hutool 示例不能从固定依赖运行 |
| docs build | VuePress 配置、Markdown 或客户端渲染构建失败 |

## 2026-10-02 治理记录

以下是治理分支的本次本地验证记录，不是已发布制品或远端部署的证明。

| 范围 | 已核验内容 | 尚不能据此声称的结论 |
|:--|:--|:--|
| 核心算法 | `npm run verify` 通过；TS 667 个测试、Java 主模块 297 个测试；共享向量和 tarball 消费通过 | 未证明全部输入空间、侧信道安全或独立安全认证 |
| Java 覆盖率 | JDK 21 下 coverage 门禁通过，主模块行覆盖率 82.6%、分支覆盖率 71.6% | SM9 JNI/C 代码不在该覆盖率范围 |
| SM9 loader | 六个隔离 JVM 用例通过；覆盖双资源加载前校验、损坏清单、重复条目、篡改及错误链 | 不是 SM9 native 算法运行证据，也不认证 JAR 发布者 |
| 文档 API | TypeDoc 命名空间、参数/异常说明与成员覆盖检查通过；JDK 21 聚合 Javadoc、Checkstyle、doclint 通过 | 标签和关键词覆盖不等于每段文字语义已被自动证明 |
| 文档示例 | Node、Java、Go、Python、Rust、Hutool 示例真实执行；`docs:verify` 在 JDK 21 + 显式 Cargo 离线缓存条件下通过 | 本机 Rust 全新下载仍受证书吊销服务不可达影响，未关闭证书校验 |
| 页面与链接 | 393 个生成 HTML、15450 次本地链接检查通过；各入口隔离缓存，回归测试覆盖跨页锚点漏检；6 类页面在 1440/1280/768/390 像素下检查无页面级横向溢出 | 外部链接可用性和生产 CDN 状态未由本地检查证明 |
| 部署脚本 | 制品/路径契约、无效版本清单拒绝与 EdgeOne 客户端测试通过；工作流 YAML 可解析 | 未实际连接源站或刷新生产缓存 |

兼容性保持：未删除公开算法入口或 deprecated 别名；空 `userId` 仍使用默认值；RNG 默认仍为 `warn`，`strict` 继续可选。TypeScript 仍不实现 SM9。

## 后续优先级

1. **发布前补齐远端证据。** 对最终 commit 运行五平台 SM9 native/聚合 JAR 消费测试，绑定 Action run 与 commit；本地 native 缺失时跳过的测试不得作为签名、IBE、PEM、状态复用成功的证据。部署后再核对 `deployment.json` 和 `www` HTTPS 跳转。
2. **分工作区维护依赖。** 本次 npm 全 workspace 审计为 17 项（7 moderate、10 high），不是“零漏洞”。区分算法包的打包依赖、测试/文档工具链和 Studio；先做兼容补丁升级，再评估 Vitest 主版本迁移。Studio 的 node-forge 报告仍需单独跟进，不用 `audit fix --force` 混入算法发布。
3. **补充独立向量和模糊测试。** 把 SM4 CTR/CFB/OFB/GCM/CCM 的已验证数据纳入共享 JSON；补原始非整字节 EIA3 标准向量。ASN.1、密文布局、padding、AEAD tag/nonce 和流式分块优先增加畸形输入及独立实现差分测试，再考虑性能优化。
4. **降低文档门禁的文本匹配比例。** TypeScript 导出清单改用编译器符号，Java 公共成员/重载清单改用 AST 或 doclet；继续保留可执行示例，不能用“有注释”替代异常、单位、默认值和生命周期的真实说明。
5. **固化可重复验收。** 将本次桌面/手机布局检查接入浏览器 CI；为历史 API 快照增加源码 commit/制品摘要核验。Rust 缓存可提升本地复核效率，但保留全新环境 lane 和明确的下载失败。

后续算法性能修改应先保留基准、固定向量和负向测试；SM2 确认流程的新便利 API 只能作为兼容增量设计，不能暗改现有 S1/S2 字段或随机数策略。

## npm tarball

当前白名单为：

```text
dist/
README.md
LICENSE
THIRD_PARTY_NOTICES.md
package.json
```

`package.json` 由 npm 自动包含。`audit:pack` 使用 `npm pack --json --dry-run` 检查真实清单、压缩/解压体积和 source map，而不是只相信 `.npmignore`。

人工确认 tarball 不包含：测试、benchmark、文档源码、Studio、构建缓存、真实密钥、token、内部 endpoint、个人目录或临时日志。

## 文档内容

- 每个算法页明确 key、IV/nonce、模式、填充、编码和错误语义。
- 随机算法示例检查往返/验签与篡改拒绝，不固化一次随机输出。
- 外部语言页面锁定依赖版本，并有 CI 可执行 fixture。
- 项目向量与外部标准向量明确区分，不用自身输出自证正确性。
- 性能结论附环境、commit、命令和完整结果，不发布无法复现的“典型值”。
- 兼容 API、空 userId 和 RNG 默认策略与当前代码一致。
- SM9 只在 Java/native 边界描述，不出现 TypeScript 假实现。

## 发布结论

只有所有适用门禁成功、工作区和 tag 版本核对完成后才创建 `ts-v*` 标签。任何失败都必须修复或形成公开、可评估的阻断说明，不能以“只是示例”“只是文档”跳过。

- [TypeScript 发布与验收](/maintenance/publishing)
- [验证模型与证据](/maintenance/reports/validation-model)
