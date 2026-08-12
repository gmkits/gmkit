# 共享互操作测试向量

`vectors/` 存放 Java 与 TypeScript 共用的跨语言互操作向量。它用于固定协议边界，而不是声明两个语言拥有相同公共 API。

## 文件

- `interop.json`：SM2、SM3、SM4、ZUC 的 schema 化互操作用例。
- `interop.schema.json`：共享向量的结构和来源约束；Java 与 TypeScript 测试都会执行关键来源校验。

当前消费方：

- TypeScript：`packages/ts/test/interop-compliance.test.ts`
- Java：`packages/java/gmkit/src/test/java/cn/gmkit/InteropComplianceTest.java`

Java 测试通过 Maven test resources 将根级 `vectors/` 挂载到 classpath；TypeScript 测试直接从 monorepo 根读取 JSON。

## 向量规则

- `sourceType: "project-fixture"` 表示项目回归向量，只用于 GMKit Java/TS 对齐，不能写成国标固定向量。
- `sourceType: "standard"` 表示有外部标准或参考实现来源的向量，`sourceRef` 必须写明标准来源，例如 `GM/T 0004-2012`、`3GPP TS 35.221` 或 `3GPP TS 35.222`。
- 每个 case 必须有唯一 `sourceId`、可核对的 `sourceRef` 和描述；`meta.encoding` 说明字符串输入按 UTF-8 编码，Hex 字段按小写十六进制解释。
- SM2 加密和未固定随机数的签名不比较完整字面值，只验证解密或验签性质。
- `cases` 不能为空，`id` 必须唯一；Java 与 TypeScript 消费方都必须拒绝未知操作、缺失字段和零匹配分组，不能用跳过产生假绿。
- 新增字段应向后兼容；字段重命名或删除必须同步更新 Java、TypeScript 测试和 CHANGELOG。

## ZUC 字段约定

- `count` 是传给 API 的无符号 32-bit 整数值，JSON 以十进制数保存，不按宿主机端序解释。
- `op: "eea3"` 对应为兼容保留的 word-aligned EEA3 密钥流入口。
- `op: "eea3-encrypt"` 对应 3GPP TS 35.221 标准消息加密。
- `op: "eia3"` 对应 3GPP TS 35.222 的 32-bit MAC-I；`bitLength` 可表示非整字节消息。

## 本地校验

```bash
npm run parity
npm run test:ts
npm run test:java
```

涉及 `vectors/**` 的变更会触发 `parity.yml`，并在 `ci.yml` 中覆盖两端测试。
case 数量会随版本增长，以 Java/TypeScript 门禁的实际输出为准，不应把某次计数写成解析器上限。
