/**
 * 测试新的模块导入方式
 * 验证命名空间导入、算法模块导入和具名函数导入都能正常工作
 */

import { describe, it, expect } from 'vitest';

describe('模块导入方式测试', () => {
  describe('算法模块导入', () => {
    it('应该能够通过 sm2 模块导入使用 SM2 功能', async () => {
      const { sm2 } = await import('../src/index');

      // 测试密钥生成
      const keyPair = sm2.generateKeyPair();
      expect(keyPair.publicKey).toBeTruthy();
      expect(keyPair.privateKey).toBeTruthy();

      // 测试加解密
      const plaintext = '测试 SM2 模块导入';
      const encrypted = sm2.encrypt(keyPair.publicKey, plaintext);
      const decrypted = sm2.decrypt(keyPair.privateKey, encrypted);
      expect(decrypted).toBe(plaintext);

      // 测试类导出
      expect(sm2.SM2).toBeDefined();
      const sm2Instance = sm2.SM2.generateKeyPair();
      expect(sm2Instance.getPublicKey()).toBeTruthy();
    });

    it('应该能够通过 sm3 模块导入使用 SM3 功能', async () => {
      const { sm3 } = await import('../src/index');

      // 测试哈希计算
      const hash = sm3.digest('abc');
      expect(hash).toBe('66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0');

      // 测试 HMAC
      const mac = sm3.hmac('key', 'data');
      expect(mac).toHaveLength(64);

      // 测试类导出
      expect(sm3.SM3).toBeDefined();
      const sm3Instance = new sm3.SM3();
      sm3Instance.update('test');
      const result = sm3Instance.digest();
      expect(result).toHaveLength(64);
    });

    it('应该能够通过 sm4 模块导入使用 SM4 功能', async () => {
      const { sm4, CipherMode, PaddingMode } = await import('../src/index');

      const key = '0123456789abcdeffedcba9876543210';
      const plaintext = '测试 SM4 模块导入';

      // 测试加解密
      const encrypted = sm4.encrypt(key, plaintext, {
        mode: CipherMode.ECB,
        padding: PaddingMode.PKCS7,
      });
      const decrypted = sm4.decrypt(key, encrypted, {
        mode: CipherMode.ECB,
        padding: PaddingMode.PKCS7,
      });
      expect(decrypted).toBe(plaintext);

      // 测试类导出
      expect(sm4.SM4).toBeDefined();
      const sm4Instance = new sm4.SM4(key);
      const encrypted2 = sm4Instance.encrypt(plaintext);
      expect(encrypted2).toBeTruthy();
    });

    it('应该能够通过 zuc 模块导入使用 ZUC 功能', async () => {
      const { zuc } = await import('../src/index');

      const key = '00112233445566778899aabbccddeeff';
      const iv = 'ffeeddccbbaa99887766554433221100';
      const plaintext = '测试 ZUC 模块导入';

      // 测试加解密
      const encrypted = zuc.encrypt(key, iv, plaintext);
      const decrypted = zuc.decrypt(key, iv, encrypted);
      expect(decrypted).toBe(plaintext);

      // 测试密钥流生成
      const keystream = zuc.getKeystream(key, iv, 4);
      expect(keystream).toHaveLength(32); // 4 words * 8 hex chars
    });
  });

  describe('具名函数导入（向后兼容）', () => {
    it('应该能够导入具名函数', async () => {
      const {
        sm2Encrypt,
        sm2Decrypt,
        generateKeyPair,
        digest,
        sm4Encrypt,
        sm4Decrypt,
        zucEncrypt,
        zucDecrypt,
        CipherMode,
        PaddingMode,
      } = await import('../src/index');

      // SM2
      const keyPair = generateKeyPair();
      const sm2Cipher = sm2Encrypt(keyPair.publicKey, 'test');
      const sm2Plain = sm2Decrypt(keyPair.privateKey, sm2Cipher);
      expect(sm2Plain).toBe('test');

      // SM3
      const hash = digest('abc');
      expect(hash).toBe('66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0');

      // SM4
      const key = '0123456789abcdeffedcba9876543210';
      const sm4Cipher = sm4Encrypt(key, 'test', { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
      const sm4Plain = sm4Decrypt(key, sm4Cipher, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
      expect(sm4Plain).toBe('test');

      // ZUC
      const zucKey = '00112233445566778899aabbccddeeff';
      const zucIv = 'ffeeddccbbaa99887766554433221100';
      const zucCipher = zucEncrypt(zucKey, zucIv, 'test');
      const zucPlain = zucDecrypt(zucKey, zucIv, zucCipher);
      expect(zucPlain).toBe('test');
    });
  });

  describe('命名空间导入', () => {
    it('应该能够通过命名空间访问所有算法', async () => {
      const gmkit = await import('../src/index');

      // 验证模块存在
      expect(gmkit.sm2).toBeDefined();
      expect(gmkit.sm3).toBeDefined();
      expect(gmkit.sm4).toBeDefined();
      expect(gmkit.zuc).toBeDefined();

      // 验证可以通过模块使用功能
      const keyPair = gmkit.sm2.generateKeyPair();
      expect(keyPair.publicKey).toBeTruthy();

      const hash = gmkit.sm3.digest('test');
      expect(hash).toHaveLength(64);
    });
  });
});
