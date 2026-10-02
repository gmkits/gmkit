import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateInterop } from './helpers/interop-schema';
import { digest as sm3Digest, hmac as sm3Hmac } from '../src/crypto/sm3';
import { sha256, sha384, sha512 } from '../src/crypto/sha';
import { encrypt as sm4Encrypt, decrypt as sm4Decrypt } from '../src/crypto/sm4';
import {
  encrypt as zucEncrypt,
  decrypt as zucDecrypt,
  getKeystream as zucKeystream,
  eea3,
  eea3Encrypt,
  eia3,
} from '../src/crypto/zuc';
import { hexToBytes } from '../src/core/utils';
import {
  generateKeyPair,
  encrypt as sm2Encrypt,
  decrypt as sm2Decrypt,
  sign as sm2Sign,
  verify as sm2Verify,
  getPublicKeyFromPrivateKey as sm2GetPublicKey,
  keyExchange as sm2KeyExchange,
} from '../src/crypto/sm2';
import { CipherMode, InputFormat, OutputFormat, PaddingMode, SM2CipherMode } from '../src/types/constants';

function applyValidationChange(root: any, change: any): any {
  let parent = root;
  if (change.caseId) {
    parent = root.cases.find((vector: any) => vector.id === change.caseId);
    if (!parent) throw new Error(`Unknown regression case: ${change.caseId}`);
  }
  const path = change.path as Array<string | number>;
  if (path.length === 0) return change.value;
  for (const field of path.slice(0, -1)) {
    if (parent === null || typeof parent !== 'object' || !(field in parent)) {
      throw new Error(`Invalid regression path: ${path.join('.')}`);
    }
    parent = parent[field];
  }
  const field = path[path.length - 1];
  if (change.remove) delete parent[field];
  else parent[field] = change.value;
  return root;
}

/**
 * 互操作性和标准符合性测试
 * 区分外部证据与项目 fixture；共同验证来源约束和跨语言输出。
 */
describe('互操作性和标准测试向量', () => {
  let interopVectors: any;

  const schema = JSON.parse(readFileSync(resolve(__dirname, '../../../vectors/interop.schema.json'), 'utf-8'));
  const regressions = JSON.parse(readFileSync(resolve(__dirname, '../../../vectors/interop-validation.json'), 'utf-8'));

  beforeAll(() => {
    interopVectors = JSON.parse(readFileSync(resolve(__dirname, '../../../vectors/interop.json'), 'utf-8'));
    validateInterop(interopVectors, schema);
  });

  it('共享向量必须通过 Draft 2020-12 schema 及唯一性校验', () => {
    validateInterop(interopVectors, schema);
    expect(Array.isArray(regressions.tests)).toBe(true);
    expect(regressions.tests.length).toBeGreaterThan(0);
  });

  it.each(regressions.tests)('shared validation: $name', (regression: any) => {
    let vectors = JSON.parse(JSON.stringify(interopVectors));
    let constraints = JSON.parse(JSON.stringify(schema));
    for (const change of regression.changes) {
      const target = change.target === 'schema' ? constraints : vectors;
      const changed = applyValidationChange(target, change);
      if (change.target === 'schema') constraints = changed;
      else vectors = changed;
    }
    const validate = () => validateInterop(vectors, constraints);
    if (regression.valid) expect(validate, regression.name).not.toThrow();
    else expect(validate, regression.name).toThrow();
  });

  describe('SM3 固定输出与互操作性', () => {
    // 固定回归输出；空消息不宣称为 GM/T 0004-2012 附录测试向量。
    const referenceVectors = [
      {
        name: '空字符串',
        input: '',
        expected: '1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b',
      },
      {
        name: 'abc',
        input: 'abc',
        expected: '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0',
      },
      {
        name: '重复字符串（64字节）',
        input: 'abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd',
        expected: 'debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732',
      },
    ];

    referenceVectors.forEach((vector) => {
      it(`应该匹配 SM3 固定输出 - ${vector.name}`, () => {
        const result = sm3Digest(vector.input);
        expect(result).toBe(vector.expected);
      });
    });

    it('应该符合互操作向量 - SM3摘要', () => {
      const sm3Cases = interopVectors.cases?.filter((c: any) => c.algo === 'SM3' && c.op === 'digest') || [];
      expect(sm3Cases.length).toBeGreaterThan(0);

      sm3Cases.forEach((testCase: any) => {
        const result = sm3Digest(testCase.input);
        expect(result).toBe(testCase.expected.hex);
      });
    });
  });

  describe('SM4 互操作性与项目回归', () => {
    // 项目往返 fixture，不是 GM/T 0002-2012 附录向量。
    const testVectors = [
      {
        name: 'ECB基础测试',
        key: '0123456789abcdeffedcba9876543210',
        mode: CipherMode.ECB,
        padding: PaddingMode.PKCS7,
        plaintext: 'Hello SM4',
        shouldDecryptCorrectly: true,
      },
      {
        name: 'CBC基础测试',
        key: '0123456789abcdeffedcba9876543210',
        iv: 'fedcba98765432100123456789abcdef',
        mode: CipherMode.CBC,
        padding: PaddingMode.PKCS7,
        plaintext: 'Hello SM4 CBC Mode',
        shouldDecryptCorrectly: true,
      },
    ];

    testVectors.forEach((vector) => {
      it(`SM4 ${vector.name}应该正确加解密`, () => {
        const options: any = {
          mode: vector.mode,
          padding: vector.padding,
        };
        
        if (vector.iv) {
          options.iv = vector.iv;
        }

        const encrypted = sm4Encrypt(vector.key, vector.plaintext, options);
        const decrypted = sm4Decrypt(vector.key, encrypted, options);
        
        if (vector.shouldDecryptCorrectly) {
          expect(decrypted).toBe(vector.plaintext);
        }
      });
    });

    it('应该符合互操作向量 - SM4加密', () => {
      const sm4Cases = interopVectors.cases?.filter((c: any) => c.algo === 'SM4' && c.op === 'encrypt') || [];
      expect(sm4Cases.length).toBeGreaterThan(0);

      sm4Cases.forEach((testCase: any) => {
        const key = testCase.keyHex || interopVectors.defaults?.sm4KeyHex;
        const iv = testCase.ivHex || interopVectors.defaults?.sm4IvHex;
        
        const options: any = {
          mode: CipherMode[testCase.mode as keyof typeof CipherMode],
          padding: PaddingMode[testCase.padding as keyof typeof PaddingMode],
        };
        
        if (testCase.mode !== 'ECB') {
          options.iv = iv;
        }

        const encrypted = sm4Encrypt(key, testCase.input, options);
        
        const decrypted = sm4Decrypt(key, encrypted, options);
        expect(decrypted).toBe(testCase.input);
        
        if (testCase.expected?.cipherHex) {
          expect(encrypted.ciphertext).toBe(testCase.expected.cipherHex);
        } else {
          expect(encrypted.ciphertext).toMatch(/^[0-9a-f]+$/);
        }
      });
    });
  });

  describe('ZUC 共享向量（来源逐条标注）', () => {
    it('应该符合互操作向量 - ZUC', () => {
      const zucCases = interopVectors.cases?.filter((c: any) => c.algo === 'ZUC') || [];
      expect(zucCases.length).toBeGreaterThan(0);

      zucCases.forEach((testCase: any) => {
        const key = testCase.keyHex || interopVectors.defaults?.zucKeyHex;
        const iv = testCase.ivHex || interopVectors.defaults?.zucIvHex;

        if (testCase.op === 'keystream') {
          expect(zucKeystream(key, iv, testCase.lengthBytes)).toBe(testCase.expected.hex);
          return;
        }

        if (testCase.op === 'encrypt') {
          const encrypted = zucEncrypt(key, iv, testCase.input);
          expect(encrypted).toBe(testCase.expected.cipherHex);
          expect(zucDecrypt(key, iv, encrypted)).toBe(testCase.input);

          if (testCase.expected.cipherBase64) {
            const base64Encrypted = zucEncrypt(key, iv, testCase.input, {
              outputFormat: OutputFormat.BASE64,
            });
            expect(base64Encrypted).toBe(testCase.expected.cipherBase64);
            expect(zucDecrypt(key, iv, base64Encrypted, {
              inputFormat: InputFormat.BASE64,
            })).toBe(testCase.input);
          }
          return;
        }

        if (testCase.op === 'eea3') {
          expect(eea3(key, testCase.count, testCase.bearer, testCase.direction, testCase.bitLength))
            .toBe(testCase.expected.hex);
          return;
        }

        if (testCase.op === 'eea3-encrypt') {
          expect(eea3Encrypt(
            key,
            testCase.count,
            testCase.bearer,
            testCase.direction,
            hexToBytes(testCase.inputHex),
            testCase.bitLength
          )).toBe(testCase.expected.cipherHex);
          return;
        }

        if (testCase.op === 'eia3') {
          const input = testCase.inputHex ? hexToBytes(testCase.inputHex) : testCase.input;
          expect(eia3(key, testCase.count, testCase.bearer, testCase.direction, input, testCase.bitLength))
            .toBe(testCase.expected.macHex);
          return;
        }

        throw new Error(`Unsupported ZUC vector op: ${testCase.op}`);
      });
    });
  });

  describe('SM2 互操作性测试', () => {
    it('应该消费全部 SM2 共享向量', () => {
      const sm2Cases = interopVectors.cases.filter((c: any) => c.algo === 'SM2');
      expect(sm2Cases.length).toBeGreaterThan(0);

      for (const testCase of sm2Cases) {
        if (testCase.op === 'encrypt') {
          const mode = SM2CipherMode[testCase.mode as keyof typeof SM2CipherMode];
          expect(mode, `unsupported SM2 mode: ${testCase.mode}`).toBeDefined();
          const ciphertext = sm2Encrypt(testCase.publicKeyHex, testCase.input, { mode });
          expect(sm2Decrypt(testCase.privateKeyHex, ciphertext, { mode }))
            .toBe(testCase.expected.plain);
          continue;
        }
        if (testCase.op === 'sign') {
          const signature = sm2Sign(testCase.privateKeyHex, testCase.input);
          expect(sm2Verify(testCase.publicKeyHex, testCase.input, signature))
            .toBe(testCase.expected.verify);
          continue;
        }
        if (testCase.op === 'key-exchange') {
          const publicKeyA = sm2GetPublicKey(testCase.initiatorStaticPrivateKeyHex);
          const tempPublicKeyA = sm2GetPublicKey(testCase.initiatorEphemeralPrivateKeyHex);
          const publicKeyB = sm2GetPublicKey(testCase.responderStaticPrivateKeyHex);
          const tempPublicKeyB = sm2GetPublicKey(testCase.responderEphemeralPrivateKeyHex);
          const resultA = sm2KeyExchange({
            privateKey: testCase.initiatorStaticPrivateKeyHex,
            publicKey: publicKeyA,
            tempPrivateKey: testCase.initiatorEphemeralPrivateKeyHex,
            peerPublicKey: publicKeyB,
            peerTempPublicKey: tempPublicKeyB,
            userId: testCase.initiatorId,
            peerUserId: testCase.responderId,
            isInitiator: true,
            keyLength: testCase.keyLengthBytes,
          });
          const resultB = sm2KeyExchange({
            privateKey: testCase.responderStaticPrivateKeyHex,
            publicKey: publicKeyB,
            tempPrivateKey: testCase.responderEphemeralPrivateKeyHex,
            peerPublicKey: publicKeyA,
            peerTempPublicKey: tempPublicKeyA,
            userId: testCase.responderId,
            peerUserId: testCase.initiatorId,
            isInitiator: false,
            keyLength: testCase.keyLengthBytes,
          });
          expect(resultA.sharedKey).toBe(testCase.expected.sharedKeyHex);
          expect(resultB.sharedKey).toBe(testCase.expected.sharedKeyHex);
          expect(resultA.s1).toBe(testCase.expected.s1Hex);
          expect(resultB.s1).toBe(testCase.expected.s1Hex);
          expect(resultA.s2).toBe(testCase.expected.s2Hex);
          expect(resultB.s2).toBe(testCase.expected.s2Hex);
          continue;
        }
        throw new Error(`Unsupported SM2 vector op: ${testCase.op}`);
      }
    });

    it('使用固定密钥对的签名应该可以被验证', () => {
      // 使用互操作向量中的密钥对
      const privateKey = interopVectors.defaults?.sm2PrivateKeyHex;
      const publicKey = interopVectors.defaults?.sm2PublicKeyHex;
      
      if (!privateKey || !publicKey) {
        // 如果没有互操作向量，使用自己生成的密钥对进行基本测试
        const keyPair = generateKeyPair();
        const message = 'test message';
        const signature = sm2Sign(keyPair.privateKey, message);
        const isValid = sm2Verify(keyPair.publicKey, message, signature);
        expect(isValid).toBe(true);
        return;
      }

      const message = 'Interoperability Test Message';
      const signature = sm2Sign(privateKey, message);
      const isValid = sm2Verify(publicKey, message, signature);
      
      expect(isValid).toBe(true);
    });

    it('使用固定密钥对的加密应该可以被解密', () => {
      const privateKey = interopVectors.defaults?.sm2PrivateKeyHex;
      const publicKey = interopVectors.defaults?.sm2PublicKeyHex;
      
      if (!privateKey || !publicKey) {
        // 如果没有互操作向量，使用自己生成的密钥对进行基本测试
        const keyPair = generateKeyPair();
        const plaintext = 'test data';
        const encrypted = sm2Encrypt(keyPair.publicKey, plaintext);
        const decrypted = sm2Decrypt(keyPair.privateKey, encrypted);
        expect(decrypted).toBe(plaintext);
        return;
      }

      const plaintext = 'Interoperability Test Data';
      
      // 由于SM2加密使用了随机数k，每次加密的结果都不同
      // 因此我们主要测试：使用我们自己的实现加密，然后解密，应该能恢复原文
      // 固定共享密钥失败必须让测试失败，不能降级成 warning。
      const encrypted1 = sm2Encrypt(publicKey, plaintext, { mode: SM2CipherMode.C1C3C2 });
      const decrypted1 = sm2Decrypt(privateKey, encrypted1, { mode: SM2CipherMode.C1C3C2 });
      expect(decrypted1).toBe(plaintext);

      const encrypted2 = sm2Encrypt(publicKey, plaintext, { mode: SM2CipherMode.C1C2C3 });
      const decrypted2 = sm2Decrypt(privateKey, encrypted2, { mode: SM2CipherMode.C1C2C3 });
      expect(decrypted2).toBe(plaintext);
    });

    it('不同密文模式的密文格式应该不同', () => {
      const keyPair = generateKeyPair();
      const plaintext = 'test data';
      
      const c1c3c2 = sm2Encrypt(keyPair.publicKey, plaintext, { mode: SM2CipherMode.C1C3C2 });
      const c1c2c3 = sm2Encrypt(keyPair.publicKey, plaintext, { mode: SM2CipherMode.C1C2C3 });
      
      // 密文长度应该相同
      expect(c1c3c2.length).toBe(c1c2c3.length);
      
      // 但内容应该不同（因为C2和C3的顺序不同）
      // 注意：前128字符（C1）应该不同，因为使用了不同的随机数
      expect(c1c3c2).not.toBe(c1c2c3);
    });
  });

  describe('SHA系列算法符合性', () => {
    // NIST标准测试向量
    const shaVectors = {
      sha256: [
        {
          name: '空字符串',
          input: '',
          expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
        {
          name: 'abc',
          input: 'abc',
          expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        },
      ],
      sha384: [
        {
          name: '空字符串',
          input: '',
          expected: '38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b',
        },
      ],
      sha512: [
        {
          name: '空字符串',
          input: '',
          expected: 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
        },
      ],
    };

    shaVectors.sha256.forEach((vector) => {
      it(`SHA256应该符合NIST标准 - ${vector.name}`, () => {
        const result = sha256(vector.input);
        expect(result).toBe(vector.expected);
      });
    });

    shaVectors.sha384.forEach((vector) => {
      it(`SHA384应该符合NIST标准 - ${vector.name}`, () => {
        const result = sha384(vector.input);
        expect(result).toBe(vector.expected);
      });
    });

    shaVectors.sha512.forEach((vector) => {
      it(`SHA512应该符合NIST标准 - ${vector.name}`, () => {
        const result = sha512(vector.input);
        expect(result).toBe(vector.expected);
      });
    });
  });

  describe('跨算法一致性', () => {
    it('相同输入在不同哈希算法下应该产生相同长度输出', () => {
      const input = 'consistency test';
      
      const sm3Hash = sm3Digest(input);
      const sha256Hash = sha256(input);
      
      // 两者都应该是256位 = 64个十六进制字符
      expect(sm3Hash).toHaveLength(64);
      expect(sha256Hash).toHaveLength(64);
    });

    it('所有哈希算法应该一致处理空输入', () => {
      expect(() => sm3Digest('')).not.toThrow();
      expect(() => sha256('')).not.toThrow();
      expect(() => sha384('')).not.toThrow();
      expect(() => sha512('')).not.toThrow();
      
      // 所有输出都应该是有效的十六进制字符串
      expect(sm3Digest('')).toMatch(/^[0-9a-f]+$/);
      expect(sha256('')).toMatch(/^[0-9a-f]+$/);
      expect(sha384('')).toMatch(/^[0-9a-f]+$/);
      expect(sha512('')).toMatch(/^[0-9a-f]+$/);
    });

    it('所有对称加密算法应该支持相同的模式', () => {
      const key = '0123456789abcdeffedcba9876543210';
      const iv = 'fedcba98765432100123456789abcdef';
      const plaintext = 'test data';

      // ECB
      expect(() => sm4Encrypt(key, plaintext, { 
        mode: CipherMode.ECB, 
        padding: PaddingMode.PKCS7 
      })).not.toThrow();

      // CBC
      expect(() => sm4Encrypt(key, plaintext, { 
        mode: CipherMode.CBC, 
        padding: PaddingMode.PKCS7, 
        iv 
      })).not.toThrow();

      // CTR
      expect(() => sm4Encrypt(key, plaintext, { 
        mode: CipherMode.CTR, 
        padding: PaddingMode.PKCS7, 
        iv 
      })).not.toThrow();
    });
  });

  describe('编码格式一致性', () => {
    it('所有算法应该支持十六进制输出', () => {
      const sm3Hash = sm3Digest('test');
      const sha256Hash = sha256('test');
      
      expect(sm3Hash).toMatch(/^[0-9a-f]+$/);
      expect(sha256Hash).toMatch(/^[0-9a-f]+$/);
    });

    it('加密算法应该产生有效的十六进制密文', () => {
      const key = '0123456789abcdeffedcba9876543210';
      const encrypted = sm4Encrypt(key, 'test', { 
        mode: CipherMode.ECB, 
        padding: PaddingMode.PKCS7 
      });
      
      expect(encrypted.ciphertext).toMatch(/^[0-9a-f]+$/);
      expect(encrypted.ciphertext.length % 2).toBe(0); // 应该是偶数长度
    });

    it('签名应该产生有效的十六进制字符串', () => {
      const keyPair = generateKeyPair();
      const signature = sm2Sign(keyPair.privateKey, 'test');
      
      expect(signature).toMatch(/^[0-9a-f]+$/);
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('边界条件一致性', () => {
    const algorithms = [
      { name: 'SM3', fn: sm3Digest },
      { name: 'SHA256', fn: sha256 },
      { name: 'SHA384', fn: sha384 },
      { name: 'SHA512', fn: sha512 },
    ];

    algorithms.forEach(({ name, fn }) => {
      it(`${name}应该处理最大长度输入`, () => {
        const maxInput = 'x'.repeat(1000000); // 1MB
        expect(() => fn(maxInput)).not.toThrow();
        const result = fn(maxInput);
        expect(result).toMatch(/^[0-9a-f]+$/);
      });

      it(`${name}应该处理Unicode字符`, () => {
        const unicodeInput = '你好世界🌍🎉';
        expect(() => fn(unicodeInput)).not.toThrow();
        const result = fn(unicodeInput);
        expect(result).toMatch(/^[0-9a-f]+$/);
      });
    });
  });
});
