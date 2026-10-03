---
title: GMKit 跨语言互操作向量
description: 说明 Java 与 TypeScript 共享向量的字段、来源、执行方式和证据边界。
icon: link
order: 99
category: [协议与标准, 互操作]
---

# GMKit 跨语言互操作向量

根目录 `vectors/interop.json` 是 Java 与 TypeScript 共享的协议数据。它用于验证摘要、密文、MAC、往返结果和格式边界，不表示两端具有相同 API 或 ABI，也不能代替外部标准向量。

## 信任级别

| 级别 | `sourceType` | 可证明的内容 |
|:--|:--|:--|
| 外部固定向量 | `standard`，附 `sourceRef` 定位 | 项目输出与该标准测试集的确定性结果一致 |
| 项目互操作向量 | `project-fixture` | Java 与 TypeScript 在已固定参数下字节级一致 |
| 随机算法回环 | 项目测试代码 | 生成结果可解密或验签，且篡改会被拒绝 |

项目互操作向量由仓库实现产生，不能用于证明实现本身正确。算法正确性需要外部标准向量、独立实现复核和负向测试共同支撑。

## 自动化消费方

| 实现 | 测试 |
|:--|:--|
| TypeScript | `packages/ts/test/interop-compliance.test.ts` |
| Java | `packages/java/gmkit/src/test/java/cn/gmkit/InteropComplianceTest.java` |

```bash
# 两端共享向量
npm run parity

# 单独验证
npm test -w packages/ts -- interop-compliance
mvn -f packages/java/pom.xml -B -ntp -pl gmkit -Dtest=InteropComplianceTest test
```

## 数据约定

- 每项必须填写 `sourceId`、`sourceType`、`sourceRef` 和 `description`。旧 `source` 字段只作可读说明，不再靠缺省来源判断证据等级。
- ZUC EEA3 的 800-bit 用例对应 TS 35.223 / Implementor's Test Data §4.4 Test Set 2；全零密钥流有固定参考。当前共享 EIA3 用例是项目回归：64-bit 参数组合未确认完整外部出处，direction-one 用例截取了官方 577-bit 测试的 480-bit 前缀，不能称为原始标准向量。
- SM2 加密和签名含随机数。未固定随机源时不比较完整密文或签名字面值，只验证解密结果、验签结果及篡改拒绝。
- 字符串统一使用 UTF-8，二进制字段使用偶数长度的小写 hex，不带 `0x` 前缀。

顶层 `meta` 描述向量格式版本和编码；`defaults` 只用于减少测试数据重复；`cases` 中每一项必须有稳定 `id`、`algo`、`op` 和期望结果。消费者不得根据未声明字段猜测编码或模式。

向量门禁采用 fail-closed：文件缺失、JSON 结构错误、空 `cases`、重复 `id`、未知操作、必填字段缺失或某算法分组零匹配都会失败。Java 与 TypeScript 必须消费全部 case；用例数量以测试运行输出为准，不在文档中写死。

## 字段边界

| 算法 | 必须固定的字段 |
|:--|:--|
| SM2 | `mode`、userId、raw/DER、hex/base64、公钥表示；密钥交换还需固定双方角色、静态/临时密钥、派生长度和 S1/S2 |
| SM3 | UTF-8/原始字节输入与 hex/base64 输出 |
| SM4 | `mode`、`padding`、key、IV/nonce、AAD、tag 长度 |
| ZUC | key、IV、COUNT、BEARER、DIRECTION、`bitLength`，以及 `eea3`/`eea3-encrypt` 操作语义 |

当前共享 JSON 中的 SM4 case 覆盖 ECB/CBC。CTR/CFB/OFB/GCM/CCM 使用 TypeScript 与 Java/Bouncy Castle 中相同的固定输入和输出做双端测试，但尚未并入 `vectors/interop.json`，文档不得把项目往返测试描述成共享 AEAD 向量。

ZUC 的 `count` 在 JSON 中以十进制数保存，含义是 API 接收的 32-bit 整数，不是按宿主机端序解释的四字节数组。

## TypeScript 固定断言

`sm4Encrypt` 返回对象，比较固定密文时必须读取 `result.ciphertext`：

<!-- code-sample id="standards-interop-vectors-01" steps="SM3 摘要|SM3 向量断言|SM4 单分组加密|SM4 向量断言|EIA3 完整性运算|EIA3 向量断言" -->
```ts
import {
  CipherMode,
  PaddingMode,
  eia3,
  hexToBytes,
  sm3Digest,
  sm4Encrypt,
} from 'gmkitx';

// 1. SM3 摘要：计算标准输入 abc 的摘要。
const sm3 = sm3Digest('abc');

// 2. SM3 向量断言：结果必须等于公开固定值。
if (sm3 !== '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0') {
  throw new Error(`SM3 vector mismatch: ${sm3}`);
}

// 3. SM4 单分组加密：关闭填充，验证底层分组原语结果。
const sm4Result = sm4Encrypt(
  '0123456789abcdeffedcba9876543210',
  hexToBytes('0123456789abcdeffedcba9876543210'),
  { mode: CipherMode.ECB, padding: PaddingMode.NONE },
);

// 4. SM4 向量断言：只比较固定单分组密文。
if (sm4Result.ciphertext !== '681edf34d206965e86b3e94f536e4246') {
  throw new Error(`SM4 vector mismatch: ${sm4Result.ciphertext}`);
}

// 5. EIA3 完整性运算：按固定 COUNT、BEARER、DIRECTION 和 bitLength 计算 MAC。
const mac = eia3(
  '000102030405060708090a0b0c0d0e0f',
  0x01234567,
  0x0a,
  0,
  hexToBytes('5bad724710ba1c56'),
  64,
);

// 6. EIA3 向量断言：MAC 必须等于共享固定值。
if (mac !== '1b3d0f74') {
  throw new Error(`EIA3 vector mismatch: ${mac}`);
}
```

这里使用 `throw` 而不是只打印结果或调用 `console.assert`，以便样例在不符合预期时以非零状态退出。

## Java 固定断言

<!-- code-sample id="standards-interop-vectors-02" steps="SM3 摘要|SM3 向量断言|EIA3 完整性运算|EIA3 向量断言" -->
```java
import cn.gmkit.core.HexCodec;
import cn.gmkit.sm3.SM3Util;
import cn.gmkit.zuc.ZUC;

// 1. SM3 摘要：计算标准输入 abc 的 Hex 摘要。
String sm3 = SM3Util.digestHex("abc");

// 2. SM3 向量断言：结果必须等于公开固定值。
if (!"66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0".equals(sm3)) {
    throw new IllegalStateException("SM3 vector mismatch: " + sm3);
}

// 3. EIA3 完整性运算：按固定 COUNT、BEARER、DIRECTION 和 bitLength 计算 MAC。
String mac = ZUC.eia3(
    "000102030405060708090a0b0c0d0e0f",
    0x01234567,
    0x0a,
    0,
    HexCodec.decodeStrict("5bad724710ba1c56", "EIA3 message"),
    64);

// 4. EIA3 向量断言：MAC 必须等于共享固定值。
if (!"1b3d0f74".equals(mac)) {
    throw new IllegalStateException("EIA3 vector mismatch: " + mac);
}
```

## 修改规则

1. 增加标准向量时填写准确 `sourceType: "standard"`、稳定 `sourceId`、可定位的 `sourceRef` 和 `description`；修改标准参数后应降为 `project-fixture` 并解释改动。
2. `id` 一经发布即视为稳定测试标识；改变语义时新增 case，不复用旧 `id` 掩盖不兼容变化。
3. 字段新增应保持消费者向后兼容；重命名或删除必须同步修改 Java、TypeScript 测试和 CHANGELOG。
4. 任何确定性期望值变更都应先由外部标准或独立成熟实现复核，不能只用本项目实现自证。
5. SM2 等随机算法不把一次随机输出固化成“标准值”，应固定输入并验证解密、验签与篡改拒绝。
6. 提交前运行 `npm run parity`，并运行 Java 与 TypeScript 完整测试，防止只更新一侧断言。
7. 不得捕获向量加载或算法断言异常后仅打印 warning；互操作失败必须让进程以非零状态退出。
