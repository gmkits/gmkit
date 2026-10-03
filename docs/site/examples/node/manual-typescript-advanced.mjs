import assert from 'node:assert/strict';

import {
  CipherMode,
  InputFormat,
  OutputFormat,
  PaddingMode,
  SM3,
  SM4,
  ZUCState,
  bytesToString,
  clearCustomRNG,
  configureRNG,
  derToRaw,
  getEnvReport,
  getRandomBytes,
  hasCustomRNG,
  hexToBytes,
  rawToDer,
  setCustomRNG,
  setTextCodec,
  sm2GenerateKeyPair,
  sm2KeyExchange,
  stringToBytes,
} from '../../../../packages/ts/dist/index.js';

// #region manual-ts-sm2-key-exchange
// 1. 生成长期密钥：A 和 B 的公钥必须通过业务系统预先完成身份绑定。
const longTermA = sm2GenerateKeyPair();
const longTermB = sm2GenerateKeyPair();

// 2. 生成临时密钥：每次会话分别生成 A、B 的临时密钥对。
const ephemeralA = sm2GenerateKeyPair();
const ephemeralB = sm2GenerateKeyPair();

// 3. 发起方计算：A 使用自己的长期/临时私钥和 B 的两个公钥派生 16 字节 key。
const exchangeA = sm2KeyExchange({
  privateKey: longTermA.privateKey,
  publicKey: longTermA.publicKey,
  userId: 'merchant@gmkit.cn',
  tempPrivateKey: ephemeralA.privateKey,
  peerPublicKey: longTermB.publicKey,
  peerTempPublicKey: ephemeralB.publicKey,
  peerUserId: 'warehouse@gmkit.cn',
  isInitiator: true,
  keyLength: 16,
});

// 4. 响应方计算：B 交换 self/peer 参数，并把角色固定为响应方。
const exchangeB = sm2KeyExchange({
  privateKey: longTermB.privateKey,
  publicKey: longTermB.publicKey,
  userId: 'warehouse@gmkit.cn',
  tempPrivateKey: ephemeralB.privateKey,
  peerPublicKey: longTermA.publicKey,
  peerTempPublicKey: ephemeralA.publicKey,
  peerUserId: 'merchant@gmkit.cn',
  isInitiator: false,
  keyLength: 16,
});

// 5. 派生密钥断言：双方必须得到相同的 16 字节共享 key。
assert.equal(exchangeA.sharedKey.length, 32);
assert.equal(exchangeA.sharedKey, exchangeB.sharedKey);

// 6. 确认标签断言：标准 S1 由 B 发给 A，S2 由 A 发给 B；当前 API 只计算，发送与验证由协议层完成。
assert.equal(exchangeA.s1, exchangeB.s1);
assert.equal(exchangeA.s2, exchangeB.s2);
const s1FromB = exchangeB.s1;
const s2FromA = exchangeA.s2;
assert.equal(s1FromB, exchangeA.s1);
assert.equal(s2FromA, exchangeB.s2);

// 7. 身份错误断言：B 的 userId 被替换后，派生 key 和确认标签不得通过比对。
const wrongIdentity = sm2KeyExchange({
  privateKey: longTermA.privateKey,
  publicKey: longTermA.publicKey,
  userId: 'merchant@gmkit.cn',
  tempPrivateKey: ephemeralA.privateKey,
  peerPublicKey: longTermB.publicKey,
  peerTempPublicKey: ephemeralB.publicKey,
  peerUserId: 'other@gmkit.cn',
  isInitiator: true,
  keyLength: 16,
});
assert.notEqual(wrongIdentity.sharedKey, exchangeB.sharedKey);
assert.notEqual(wrongIdentity.s1, exchangeB.s1);
// #endregion manual-ts-sm2-key-exchange

// #region manual-ts-advanced
// 1. 检查环境：记录 BigInt、文本 codec 和系统随机源是否可用。
const environment = getEnvReport();
assert.equal(environment.hasBigInt, true);
assert.equal(environment.hasTextEncoder, true);
assert.equal(environment.hasTextDecoder, true);

// 2. 注入测试随机源：确定性实现只用于测试，并在 finally 中立即清除。
configureRNG('strict');
setCustomRNG((length) => new Uint8Array(length).fill(0xa5));
try {
  assert.equal(hasCustomRNG(), true);
  assert.deepEqual(getRandomBytes(4), Uint8Array.of(0xa5, 0xa5, 0xa5, 0xa5));
} finally {
  clearCustomRNG();
}
assert.equal(hasCustomRNG(), false);

// 3. 随机源失败断言：宿主返回的长度不正确时必须拒绝该结果。
setCustomRNG((length) => new Uint8Array(length - 1));
try {
  assert.throws(() => getRandomBytes(16));
} finally {
  clearCustomRNG();
}

// 4. 注入 UTF-8 codec：受限宿主实现必须保持 encode/decode 往返一致。
const encoder = new TextEncoder();
const decoder = new TextDecoder();
setTextCodec({
  encode: (input) => encoder.encode(input),
  decode: (bytes) => decoder.decode(bytes),
});
const plaintext = '订单 GMKIT-DEMO-0001';
assert.equal(bytesToString(stringToBytes(plaintext)), plaintext);

// 5. 转换 SM2 签名：64 字节 raw 的 r||s 转为 DER，再无损转回 raw。
const rawSignature = `${'01'.padStart(64, '0')}${'02'.padStart(64, '0')}`;
const derSignature = rawToDer(rawSignature);
assert.equal(derToRaw(derSignature), rawSignature);

// 6. DER 失败断言：截断的 DER 签名必须被拒绝。
assert.throws(() => derToRaw(derSignature.subarray(0, derSignature.length - 1)));

// 7. 复用增量摘要：digest() 自动重置，reset() 主动丢弃未完成消息。
const incremental = new SM3().update('ab');
incremental.reset().update('abc');
assert.equal(
  incremental.digest(),
  '66c7f0f462eeedd9d1f2d46bdc10e4e2'
    + '4167c4875cf2f7a2297da02b8f4ba8e0',
);

// 8. SM4-GCM 实例加密：实例保存 key/mode，当前消息仍要设置独立 nonce。
const sm4 = new SM4('0123456789abcdeffedcba9876543210', {
  mode: CipherMode.GCM,
  padding: PaddingMode.NONE,
  iv: '000102030405060708090a0b',
});
const encrypted = sm4.encrypt('order=GMKIT-DEMO-0001&amount=88.00', {
  aad: 'tenant=demo;schema=1',
  outputFormat: OutputFormat.BASE64,
});

// 9. SM4-GCM 实例解密：使用相同 nonce 和 AAD 完成认证后恢复明文。
assert.equal(sm4.decrypt(encrypted, {
  aad: 'tenant=demo;schema=1',
  inputFormat: InputFormat.BASE64,
  tagFormat: InputFormat.BASE64,
}), 'order=GMKIT-DEMO-0001&amount=88.00');

// 10. 推进 ZUC 低层状态：initialize 后每次 generateKeyword 都消费下一个 word。
const zucState = new ZUCState();
zucState.initialize(hexToBytes('00'.repeat(16)), hexToBytes('00'.repeat(16)));
assert.equal(zucState.generateKeyword(), 0x27bede74);
assert.equal(zucState.generateKeyword(), 0x018082da);
// #endregion manual-ts-advanced

console.log('TypeScript advanced manual examples passed');
