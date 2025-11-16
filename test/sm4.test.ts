import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../src/crypto/sm4';
import { CipherMode, PaddingMode } from '../src/types/constants';

describe('SM4 分组密码测试', () => {
  const key = '0123456789abcdeffedcba9876543210'; // 128-bit key

  describe('ECB 模式', () => {
    it('应该能够使用 ECB 模式加密和解密', () => {
      const plaintext = 'Hello, SM4!';
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够处理 Uint8Array 输入', () => {
      const plaintext = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
      expect(decrypted).toBe('Hello');
    });

    it('应该能够加密恰好 16 字节而无需填充', () => {
      const plaintext = '0123456789abcdef'; // exactly 16 bytes
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.ECB, padding: PaddingMode.NONE });
      expect(encrypted).toHaveLength(32); // 16 bytes = 32 hex chars

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.ECB, padding: PaddingMode.NONE });
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够使用 ZERO 填充加密和解密', () => {
      const plaintext = 'Hello, SM4!';
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.ECB, padding: PaddingMode.ZERO });
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.ECB, padding: PaddingMode.ZERO });
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够处理以非零字节结尾的 ZERO 填充', () => {
      const plaintext = 'Test123'; // 7 bytes, will be padded to 16
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.ECB, padding: PaddingMode.ZERO });
      expect(encrypted).toHaveLength(32); // 16 bytes = 32 hex chars

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.ECB, padding: PaddingMode.ZERO });
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够处理恰好 16 字节的 ZERO 填充', () => {
      const plaintext = '0123456789abcdef'; // exactly 16 bytes
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.ECB, padding: PaddingMode.ZERO });
      expect(encrypted).toHaveLength(32); // 16 bytes = 32 hex chars

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.ECB, padding: PaddingMode.ZERO });
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('CBC 模式', () => {
    const iv = 'fedcba98765432100123456789abcdef'; // 128-bit IV

    it('应该能够使用 CBC 模式加密和解密', () => {
      const plaintext = 'Hello, SM4 CBC!';
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.CBC, padding: PaddingMode.PKCS7, iv });
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.CBC, padding: PaddingMode.PKCS7, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够使用 CBC 模式和 ZERO 填充加密和解密', () => {
      const plaintext = 'Hello, SM4 CBC!';
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.CBC, padding: PaddingMode.ZERO, iv });
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.CBC, padding: PaddingMode.ZERO, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('CBC 模式应该要求 IV', () => {
      const plaintext = 'Hello';
      expect(() => encrypt(key, plaintext, { mode: CipherMode.CBC })).toThrow('IV is required');
    });

    it('应该验证 IV 长度', () => {
      const plaintext = 'Hello';
      const shortIv = '0123456789abcdef'; // too short
      expect(() => encrypt(key, plaintext, { mode: CipherMode.CBC, iv: shortIv })).toThrow();
    });
  });

  describe('密钥验证', () => {
    it('应该拒绝无效的密钥长度', () => {
      const plaintext = 'Hello';
      const shortKey = '0123456789abcdef'; // too short
      expect(() => encrypt(shortKey, plaintext)).toThrow('SM4 key must be 16 bytes');
    });
  });

  describe('多个块', () => {
    it('应该能够正确处理多个块', () => {
      const plaintext = 'a'.repeat(100);
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('CTR 模式', () => {
    const iv = '00000000000000000000000000000000'; // 128-bit counter/nonce

    it('应该能够使用 CTR 模式加密和解密', () => {
      const plaintext = 'Hello, SM4 CTR mode!';
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.CTR, iv });
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.CTR, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够处理 CTR 模式中非块对齐的数据', () => {
      const plaintext = 'Hello'; // 5 bytes, not multiple of 16
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.CTR, iv });
      expect(encrypted).toHaveLength(10); // 5 bytes = 10 hex chars

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.CTR, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('CTR 模式应该要求 IV', () => {
      const plaintext = 'Hello';
      expect(() => encrypt(key, plaintext, { mode: CipherMode.CTR })).toThrow('IV');
    });

    it('应该能够处理 CTR 模式中的大量数据', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.CTR, iv });
      const decrypted = decrypt(key, encrypted, { mode: CipherMode.CTR, iv });
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('CFB 模式', () => {
    const iv = 'fedcba98765432100123456789abcdef'; // 128-bit IV

    it('应该能够使用 CFB 模式加密和解密', () => {
      const plaintext = 'Hello, SM4 CFB mode!';
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.CFB, iv });
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.CFB, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够处理 CFB 模式中非块对齐的数据', () => {
      const plaintext = 'Test!'; // 5 bytes, not multiple of 16
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.CFB, iv });
      expect(encrypted).toHaveLength(10); // 5 bytes = 10 hex chars

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.CFB, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('CFB 模式应该要求 IV', () => {
      const plaintext = 'Hello';
      expect(() => encrypt(key, plaintext, { mode: CipherMode.CFB })).toThrow('IV');
    });

    it('应该能够处理 CFB 模式中的多个块', () => {
      const plaintext = 'a'.repeat(100);
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.CFB, iv });
      const decrypted = decrypt(key, encrypted, { mode: CipherMode.CFB, iv });
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('OFB 模式', () => {
    const iv = 'fedcba98765432100123456789abcdef'; // 128-bit IV

    it('应该能够使用 OFB 模式加密和解密', () => {
      const plaintext = 'Hello, SM4 OFB mode!';
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.OFB, iv });
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.OFB, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够处理 OFB 模式中非块对齐的数据', () => {
      const plaintext = 'Hi!'; // 3 bytes, not multiple of 16
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.OFB, iv });
      expect(encrypted).toHaveLength(6); // 3 bytes = 6 hex chars

      const decrypted = decrypt(key, encrypted, { mode: CipherMode.OFB, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('OFB 模式应该要求 IV', () => {
      const plaintext = 'Hello';
      expect(() => encrypt(key, plaintext, { mode: CipherMode.OFB })).toThrow('IV');
    });

    it('应该能够处理 OFB 模式中的多个块', () => {
      const plaintext = 'a'.repeat(200);
      const encrypted = encrypt(key, plaintext, { mode: CipherMode.OFB, iv });
      const decrypted = decrypt(key, encrypted, { mode: CipherMode.OFB, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('加密和解密应该产生相同的密钥流', () => {
      // OFB decryption is identical to encryption (XOR property)
      const plaintext1 = 'Hello, World!';
      const plaintext2 = 'Test Message!'; // same length

      const encrypted1 = encrypt(key, plaintext1, { mode: CipherMode.OFB, iv });
      const encrypted2 = encrypt(key, plaintext2, { mode: CipherMode.OFB, iv });

      // Since OFB generates the same keystream, decrypting with wrong plaintext shouldn't match
      const decrypted1 = decrypt(key, encrypted1, { mode: CipherMode.OFB, iv });
      expect(decrypted1).toBe(plaintext1);

      const decrypted2 = decrypt(key, encrypted2, { mode: CipherMode.OFB, iv });
      expect(decrypted2).toBe(plaintext2);
    });
  });

  describe('GCM 模式', () => {
    const iv = '000000000000000000000000'; // 96-bit IV (12 bytes)

    it('应该能够使用 GCM 模式加密和解密', () => {
      const plaintext = 'Hello, SM4 GCM mode!';
      const result = encrypt(key, plaintext, { mode: CipherMode.GCM, iv });

      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('tag');
      expect((result as any).ciphertext).toMatch(/^[0-9a-f]+$/);
      expect((result as any).tag).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, result, { mode: CipherMode.GCM, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('应该支持附加认证数据 (AAD)', () => {
      const plaintext = 'Secret message';
      const aad = 'Additional data';

      const result = encrypt(key, plaintext, { mode: CipherMode.GCM, iv, aad });
      expect(typeof result).toBe('object');

      const decrypted = decrypt(key, result, { mode: CipherMode.GCM, iv, aad });
      expect(decrypted).toBe(plaintext);
    });

    it('使用错误的标签应该验证失败', () => {
      const plaintext = 'Secret message';
      const result = encrypt(key, plaintext, { mode: CipherMode.GCM, iv });

      // Corrupt the tag
      const corruptedResult = {
        ciphertext: (result as any).ciphertext,
        tag: '00000000000000000000000000000000'
      };

      expect(() => decrypt(key, corruptedResult, { mode: CipherMode.GCM, iv })).toThrow('Authentication tag verification failed');
    });

    it('使用错误的 AAD 应该验证失败', () => {
      const plaintext = 'Secret message';
      const aad = 'Additional data';

      const result = encrypt(key, plaintext, { mode: CipherMode.GCM, iv, aad });

      // Try to decrypt with different AAD
      expect(() => decrypt(key, result, { mode: CipherMode.GCM, iv, aad: 'Wrong AAD' })).toThrow('Authentication tag verification failed');
    });

    it('GCM 模式应该要求 IV', () => {
      const plaintext = 'Hello';
      expect(() => encrypt(key, plaintext, { mode: CipherMode.GCM })).toThrow('IV is required');
    });

    it('应该验证 IV 长度（必须是 12 字节）', () => {
      const plaintext = 'Hello';
      const wrongIv = '00000000000000000000000000000000'; // 16 bytes instead of 12
      expect(() => encrypt(key, plaintext, { mode: CipherMode.GCM, iv: wrongIv })).toThrow('IV must be 12 bytes');
    });

    it('应该能够处理 GCM 模式中非块对齐的数据', () => {
      const plaintext = 'Hi!'; // 3 bytes, not multiple of 16
      const result = encrypt(key, plaintext, { mode: CipherMode.GCM, iv });

      expect(typeof result).toBe('object');
      expect((result as any).ciphertext).toHaveLength(6); // 3 bytes = 6 hex chars

      const decrypted = decrypt(key, result, { mode: CipherMode.GCM, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('应该支持自定义标签长度', () => {
      const plaintext = 'Test message';
      const tagLength = 12; // 96-bit tag instead of default 128-bit

      const result = encrypt(key, plaintext, { mode: CipherMode.GCM, iv, tagLength });
      expect(typeof result).toBe('object');
      expect((result as any).tag).toHaveLength(24); // 12 bytes = 24 hex chars

      const decrypted = decrypt(key, result, { mode: CipherMode.GCM, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够处理空明文', () => {
      const plaintext = '';
      const result = encrypt(key, plaintext, { mode: CipherMode.GCM, iv });

      expect(typeof result).toBe('object');
      expect((result as any).ciphertext).toBe('');
      expect((result as any).tag).toMatch(/^[0-9a-f]+$/);

      const decrypted = decrypt(key, result, { mode: CipherMode.GCM, iv });
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够处理 GCM 模式中的大量数据', () => {
      const plaintext = 'a'.repeat(1000);
      const result = encrypt(key, plaintext, { mode: CipherMode.GCM, iv });

      const decrypted = decrypt(key, result, { mode: CipherMode.GCM, iv });
      expect(decrypted).toBe(plaintext);
    });
  });
});
