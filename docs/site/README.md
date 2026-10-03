---
home: true
title: GMKit 文档
description: GMKit 0.10.1 的 Java 与 TypeScript 快速入门、任务手册、API 参数和跨语言协议文档。
heroText: GMKit
tagline: 先跑通，再接协议；需要时再查参数
actions:
  - text: 五分钟快速入门
    link: /guide/
    type: primary
  - text: 按任务查手册
    link: /manual/
    type: primary
  - text: 查 API 参数
    link: /api/
    type: secondary
features:
  - title: 业务流程能直接运行
    details: 安装、签名验签、认证加密、摘要和篡改测试都有对应源码。
  - title: 协议字段写到字节
    details: userId、DER、C1C3C2、nonce、AAD、tag、bitLength 和编码都给出确切边界。
  - title: 常用与兼容分开
    details: 主手册只讲新接入；弃用入口、自动识别和非标准兼容集中在迁移附录。
---

## 当前发布包

<ApiTable label="GMKit 当前发布包" min-width="68rem">

| 发布包 | 当前版本 | 入口 | 当前实现范围 |
|:--|:--|:--|:--|
| `cn.gmkit:gmkit` | `0.10.1` | [Java 快速入门](/guide/java.html) | SM2、SM3、SM4、ZUC |
| `cn.gmkit:gmkit-sm9` | `0.10.1` | [Java SM9 手册](/manual/java/sm9.html) | Java API 与 JAR 内 JNI/GmSSL 运行库 |
| `gmkitx` | `0.10.1` | [TypeScript 快速入门](/guide/typescript.html) | SM2、SM3、SM4、ZUC、SHA；不包含 SM9 |

</ApiTable>

::: warning 安全状态
GMKit 当前发布包尚未完成独立第三方安全审计。固定向量和单元测试只能证明已覆盖行为，不能替代密码产品认证、密钥管理设计或目标运行环境的安全评估。
:::

## 现在要做什么

<div class="doc-path-grid">
  <a class="doc-path-card" href="/guide/">
    <span class="doc-path-label">第一次使用</span>
    <strong>安装并运行固定向量</strong>
    <small>选择 TypeScript 或 Java，在五分钟内确认依赖、编码和运行环境。</small>
  </a>
  <a class="doc-path-card" href="/manual/typescript/">
    <span class="doc-path-label">gmkitx</span>
    <strong>接入 TypeScript 业务</strong>
    <small>从数据编码开始，依次完成 SM2、摘要/HMAC、SM4 和 ZUC。</small>
  </a>
  <a class="doc-path-card" href="/manual/java/">
    <span class="doc-path-label">cn.gmkit</span>
    <strong>接入 Java 业务</strong>
    <small>从 Provider 和安全上下文开始，按需使用主包、SM9 或混合加密。</small>
  </a>
  <a class="doc-path-card" href="/manual/interoperability.html">
    <span class="doc-path-label">Java ↔ TypeScript</span>
    <strong>固定跨语言载荷</strong>
    <small>明确 UTF-8、Base64、DER、C1C3C2、GCM 字段和 schema 版本。</small>
  </a>
</div>

## 阅读路径

- [五分钟快速入门](/guide/)：安装发布包并执行最小验证示例。
- [使用手册](/manual/)：按业务任务完成成功、篡改和非法输入案例。
- [API 说明书](/api/)：任务已经明确时，核对参数、返回值、默认值和重载。
- [算法](/algorithms/)：按 SM2、SM3、SM4、ZUC、SM9、SHA 查阅两端能力与边界。
- [协议与标准](/standards/)：查看输入输出约定、标准来源和测试证据边界。
- [旧系统迁移](/manual/migration.html)：只在维护弃用入口或无格式历史数据时查阅。
- [集成示例](/integrations/)：查看 Java、Hutool、Go、Python、Rust 和 Node 示例。
- [扩展包](/extensions/)：了解未来工具包如何接入文档、版本和测试。
- [项目维护](/maintenance/)：查看架构、发布、基准和维护规则。

包版本和入口由 [`catalog/packages.json`](https://github.com/gmkits/gmkit/blob/main/docs/site/catalog/packages.json) 维护。新增能力以实际发布制品和测试结果为准，目录登记不代表安全认证或标准合规结论。

## 文档源码位置

站点源码固定在 `docs/site`；根目录 `docs` 还保存不依赖站点构建的项目级策略文件。算法包只放在 `packages`，应用只放在 `apps`，文档门户不是 npm 或 Maven 发布包。移动源码目录不会改变 `gmkit.cn` 上的页面 URL。

```text
docs/site/
├── guide/                  安装、环境检查和首次运行
├── manual/typescript/      TypeScript 任务手册
│   └── api/                TypeScript 中文 API 详解
├── manual/java/            Java 任务手册
│   └── api/                Java 中文 API 详解
├── algorithms/             算法输入输出、标准来源和未覆盖边界
├── api/                    API 门户入口、公共协议和覆盖清单
├── integrations/           Go/Python/Rust/Hutool 等第三方集成示例
├── extensions/             未来扩展包的登记和交付契约
├── maintenance/            发布、部署、验证和架构维护
├── examples/               被 CI 执行的示例源码
└── catalog/                发布包和文档入口注册表
```

`manual/<language>/api/` 是需要人阅读的中文 API 说明，负责参数编码、默认值、错误条件、状态变化、生命周期和安全边界。`api/<language>/` 只作为自动生成签名索引入口；TypeDoc 与 Javadoc 的 HTML 由构建任务写入站点产物，不提交到源码目录。旧的 `/api/typescript/<algorithm>.html` 和 `/api/java/<algorithm>.html` 链接由站点重定向到新的中文说明路径。

新增语言或扩展包时，先在 `catalog/packages.json` 登记包坐标、版本、手册入口、生成器和测试命令，再新增对应 `manual`、`api` 或 `integrations` 页面。目录登记本身不代表实现已发布，也不代表标准或安全结论已经成立。
