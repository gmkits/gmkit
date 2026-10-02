# 共享互操作测试向量

`vectors/` 存放 Java 与 TypeScript 共用的跨语言互操作向量。它用于固定协议边界，而不是声明两个语言拥有相同公共 API。

## 文件

- `interop.json`：SM2、SM3、SM4、ZUC 的 schema 化互操作用例。
- `interop.schema.json`：共享向量的结构、操作组合和已核对来源约束；Java 与 TypeScript 测试均读取此文件。
- `interop-validation.json`：两端共用的有效/无效变异用例，每次从原向量和原 schema 独立加载，不产生新的密码学输出。

当前消费方：

- TypeScript：`packages/ts/test/interop-compliance.test.ts`
- Java：`packages/java/gmkit/src/test/java/cn/gmkit/InteropComplianceTest.java`

Java 测试通过 Maven test resources 将根级 `vectors/` 挂载到 classpath；TypeScript 测试直接从 monorepo 根读取 JSON。

## 向量规则

- `sourceType: "project-fixture"` 表示项目回归向量，只用于 GMKit Java/TS 对齐，不能写成国标固定向量。
- `sourceType: "standard"` 沿用 schema v2 的分类，表示已核对的外部标准或官方参考测试，不等于国标认证。`sourceRef` 必须定位到具体版本、章节或测试代码。只有一个标准编号或任意 HTTPS URL 不构成证据。
- 标准项必须匹配 schema 的 `reviewedStandard` 清单，包括来源与完整参数/期望输出；新增或变更时须一起核对 primary source，不能通过复制已知 `sourceId` 把项目输出提升为标准值。
- fixture 的 `sourceRef` 固定为 `vectors/interop.json`，可选旧字段 `source` 只能是 `project`，`sourceId` 不得使用保留的标准/BC 来源前缀。自由文本的真实性仍需人工审核。
- 每个 case 必须有唯一 `id`、唯一 `sourceId`、可核对的 `sourceRef` 和非空描述，元数据不得有首尾空白。`meta.encoding` 必须为 `hex`，指二进制 Hex 字段；`input` 文本仍按 UTF-8 编码，不要求所有 JSON 字符串都是 Hex。
- SM2 加密和未固定随机数的签名不比较完整字面值，只验证解密或验签性质。
- `cases` 不能为空，`id` 必须唯一；Java 与 TypeScript 消费方都必须拒绝未知操作、缺失字段和零匹配分组，不能用跳过产生假绿。
- `id` 是稳定测试标识；来源纠错可修正 `sourceId/sourceType/sourceRef/description`，不得据此改变原始参数或数学输出。旧 `source` 不得与新来源字段冲突。

## ZUC 字段约定

- `count` 是传给 API 的无符号 32-bit 整数值，JSON 以十进制数保存，不按宿主机端序解释。
- `op: "eea3"` 对应为兼容保留的 word-aligned EEA3 密钥流入口。
- `op: "eea3-encrypt"` 对应 3GPP TS 35.221 标准消息加密。
- `op: "eia3"` 对应 3GPP TS 35.221 定义的 32-bit MAC-I；`bitLength` 是消息长度，可表示非整字节消息，不是 MAC 位数。TS 35.222 是 ZUC 原语，TS 35.223 引用实现者测试数据。

## 来源核对记录（2026-10-02）

- [ETSI TS 135 223 V18.0.0 / 3GPP TS 35.223](https://www.etsi.org/deliver/etsi_ts/135200_135299/135223/18.00.00_60/ts_135223v180000p.pdf) 第 5 页引用 ETSI/SAGE Document 3 v1.1；[ETSI 官方算法索引](https://www.etsi.org/expertise/algorithms-codes/) 区分 35.221、35.222、35.223 的职责。不能把原语说明当作某条 EIA3 测试值的出处。
- `zuc-eea3-3gpp-800-bit`：核对 [GSMA 分发的 ETSI/SAGE Document 3 v1.1](https://www.gsma.com/solutions-and-impact/technologies/security/wp-content/uploads/2019/05/eea3eia3testdatav11.pdf#page=16) §4.4 Test Set 2，第 16-17 页。key、COUNT `0x00056823`、BEARER `0x18`、DIRECTION 1、800-bit 消息及完整密文相符，保留 `standard`，来源从错误的 35.221 改为 35.223。
- `zuc-eia3-3gpp-direction-one`：上述文档 §5.4 Test Set 3，第 20 页原数据是 577 bit、MAC `fae8ff0b`。本项目只保留相同消息的前 480 bit，MAC 为 `395c1192`，因此是派生的项目 fixture，不是该标准向量。
- `zuc-eia3-3gpp-64-bit`：消息仅与上述文档 §5.6 Test Set 5 的前 64 bit 相同，但原测试为 5670 bit，且 key/COUNT/BEARER 不同。未找到现有完整参数与 `1b3d0f74` 的 primary-source 对应记录，保守标为 fixture，不声称它不存在于所有其他来源。
- `zuc-keystream-zero`：核对 [官方 BC r1rv83 ZucTest.java 的 Zuc128Test.TEST4](https://github.com/bcgit/bc-java/blob/r1rv83/core/src/test/java/org/bouncycastle/crypto/test/ZucTest.java#L114-L116)，全零 128-bit key/IV 的前 8 字节一致；标明是官方参考测试的前缀，不包装成完整国标认证。
- 其余 SM2/SM3/SM4/ZUC 项逐条保留项目来源。SM2 的随机加密/签名和项目密钥交换结果都不冒充外部标准固定值。两条 EIA3 的旧 `id` 中仍有 `3gpp`，仅为保持引用稳定；应以显式来源字段判定证据等级。

访问说明：本次 GSMA PDF 直接打开返回 403，核对使用搜索服务提取的 **GSMA 官方 PDF 索引正文**（第 16、17、20、21 页），不是第三方转载，也没有运行本项目生成新“标准值”。BC 固定版本源码和 ETSI PDF 可直接读取；GSMA 链接可用性是后续复核风险。

## 校验范围

两端读取同一 `interop.schema.json`，由成熟库执行 JSON Schema Draft 2020-12 校验，不再维护手写解释器：TypeScript 使用 [Ajv 8.20.0 的 2020 入口](https://ajv.js.org/json-schema.html#draft-2020-12)，Java 使用 [networknt json-schema-validator 2.0.4](https://github.com/networknt/json-schema-validator/tree/2.0.4)（Java 8 / Jackson 2）。每条变异用例独立编译，避免同一 `$id` 命中旧 schema 缓存。

两端校验 schema 合法性并拒绝未知关键词；关闭类型转换，不自动修正向量。`format` 按 Draft 2020-12 作为注释，不启用格式断言（TS 不额外引入 ajv-formats）。`integer`、数值边界、`anyOf` 和布尔 schema 等由库处理，不再受旧子集限制。`id/sourceId` 字段唯一性仍由薄辅助层检查，普通 `uniqueItems` 不能表达它。共享回归只断言接受/拒绝并报告用例名称，不绑定库错误文案或内部错误字段。

networknt 使用官方 `DisallowUnknownKeywordFactory`；Ajv 开启 `strictSchema`，另用一个仅遍历 schema 节点的关键词扫描补足未引用 `$defs` 的检查。扫描查询 Ajv 的关键词实现，并放行规范中的声明和注释字段，不维护自制关键词语义或执行校验；`const/default/examples` 等数据中的字段不会被误判为 schema 关键词。

Ajv 仅为 TS `devDependency`，networknt 及其传递依赖仅为 Maven `test` scope；辅助器只在测试目录中，不进入发布包或生产运行时，不改变公开 API。当前共享 schema 只使用本地引用，测试不应依赖在线获取 schema。Java 使用库默认的 JDK 正则引擎，不能声称与 ECMAScript 所有正则语法等价；当前元数据模式由同一批空白/Unicode 回归验证，未来新增复杂正则仍须双端核对。

项目 fixture 的密码学字段格式、长度、默认值和操作结果仍主要由算法测试验证，并未全部编码进 schema。现有 Java `MiniJson` 也不是严格 RFC 8259 解析器；本次不扩大到任意 JSON 文本的解析一致性。来源清单不能自动证明自由文本的真实出处，新增来源仍需人工核查。

## 本地校验

```bash
npm run parity
npm test -w packages/ts -- test/interop-compliance.test.ts
mvn -f packages/java/pom.xml -B -ntp -pl gmkit -Dtest=InteropComplianceTest test
```

涉及 `vectors/**` 的变更会触发 `parity.yml`，并在 `ci.yml` 中覆盖两端测试。
case 数量会随版本增长，以 Java/TypeScript 门禁的实际输出为准，不应把某次计数写成解析器上限。
