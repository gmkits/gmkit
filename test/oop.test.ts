import { describe, it, expect } from 'vitest';
import { SM2, SM3, SM4, ZUC } from '../src/index';
import { CipherMode, PaddingMode, SM2CipherMode } from '../src/types/constants';

describe('面向对象 API 测试', () => {
  describe('SM2 椭圆曲线密码', () => {
    it('应该能够生成密钥对', () => {
      const sm2 = SM2.generateKeyPair();
      expect(sm2.getPublicKey()).toBeTruthy();
      expect(sm2.getPrivateKey()).toBeTruthy();
    });

    it('应该能够从私钥创建实例', () => {
      const sm2 = SM2.generateKeyPair();
      const privateKey = sm2.getPrivateKey();

      const sm2FromPrivate = SM2.fromPrivateKey(privateKey);
      expect(sm2FromPrivate.getPrivateKey()).toBe(privateKey);
      expect(sm2FromPrivate.getPublicKey()).toBeTruthy();
    });

    it('应该能够从公钥创建实例', () => {
      const sm2 = SM2.generateKeyPair();
      const publicKey = sm2.getPublicKey();

      const sm2FromPublic = SM2.fromPublicKey(publicKey);
      expect(sm2FromPublic.getPublicKey()).toBe(publicKey);
      expect(() => sm2FromPublic.getPrivateKey()).toThrow();
    });

    it('应该能够加密和解密', () => {
      const sm2 = SM2.generateKeyPair();
      const plaintext = 'Hello, SM2!';

      const encrypted = sm2.encrypt(plaintext);
      expect(encrypted).toBeTruthy();

      const decrypted = sm2.decrypt(encrypted);
      expect(decrypted).toBeTruthy();
    });

    it('应该能够签名和验证', () => {
      const sm2 = SM2.generateKeyPair();
      const data = 'Message to sign';

      const signature = sm2.sign(data);
      expect(signature).toBeTruthy();

      const isValid = sm2.verify(data, signature);
      expect(isValid).toBe(true);
    });

    it('应该支持自定义曲线参数', () => {
      const curveParams = {
        p: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF',
        a: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC',
        b: '28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93',
      };

      const sm2 = SM2.generateKeyPair(curveParams);
      expect(sm2.getCurveParams()).toEqual(curveParams);

      sm2.setCurveParams({ ...curveParams, n: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123' });
      expect(sm2.getCurveParams()?.n).toBeTruthy();
    });

    it('应该支持密文模式', () => {
      const sm2 = SM2.generateKeyPair();
      const plaintext = 'Hello';

      const encrypted1 = sm2.encrypt(plaintext, SM2CipherMode.C1C3C2);
      expect(encrypted1).toBeTruthy();

      const encrypted2 = sm2.encrypt(plaintext, SM2CipherMode.C1C2C3);
      expect(encrypted2).toBeTruthy();
    });

    it('应该能够执行密钥交换', () => {
      const sm2A = SM2.generateKeyPair();
      const sm2B = SM2.generateKeyPair();

      // Generate temporary key pairs
      const tempA = SM2.generateKeyPair();
      const tempB = SM2.generateKeyPair();

      // A initiates key exchange
      const resultA = sm2A.keyExchange(
        sm2B.getPublicKey(),
        tempB.getPublicKey(),
        true,
        { tempPrivateKey: tempA.getPrivateKey() }
      );

      // B responds to key exchange
      const resultB = sm2B.keyExchange(
        sm2A.getPublicKey(),
        tempA.getPublicKey(),
        false,
        { tempPrivateKey: tempB.getPrivateKey() }
      );

      // Both should derive the same shared key
      expect(resultA.sharedKey).toBe(resultB.sharedKey);
      expect(resultA.sharedKey).toBeTruthy();
      expect(resultA.sharedKey).toMatch(/^[0-9a-f]+$/);
    });

    it('应该能够使用自定义选项执行密钥交换', () => {
      const sm2A = SM2.generateKeyPair();
      const sm2B = SM2.generateKeyPair();
      const tempA = SM2.generateKeyPair();
      const tempB = SM2.generateKeyPair();

      const resultA = sm2A.keyExchange(
        sm2B.getPublicKey(),
        tempB.getPublicKey(),
        true,
        {
          tempPrivateKey: tempA.getPrivateKey(),
          userId: 'alice',
          peerUserId: 'bob',
          keyLength: 32,
        }
      );

      const resultB = sm2B.keyExchange(
        sm2A.getPublicKey(),
        tempA.getPublicKey(),
        false,
        {
          tempPrivateKey: tempB.getPrivateKey(),
          userId: 'bob',
          peerUserId: 'alice',
          keyLength: 32,
        }
      );

      expect(resultA.sharedKey).toBe(resultB.sharedKey);
      expect(resultA.sharedKey.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe('SM3 哈希算法', () => {
    it('应该能够计算摘要（静态方法）', () => {
      const hash = SM3.digest('Hello, SM3!');
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash).toHaveLength(64);
    });

    it('应该能够计算 HMAC（静态方法）', () => {
      const mac = SM3.hmac('secret-key', 'data');
      expect(mac).toMatch(/^[0-9a-f]+$/);
      expect(mac).toHaveLength(64);
    });

    it('应该支持增量哈希', () => {
      const sm3 = new SM3();
      sm3.update('Hello, ').update('SM3!');
      const hash = sm3.digest();
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash).toHaveLength(64);

      // Should match single digest
      const hashDirect = SM3.digest('Hello, SM3!');
      expect(hash).toBe(hashDirect);
    });

    it('应该支持重置', () => {
      const sm3 = new SM3();
      sm3.update('data1');
      sm3.reset();
      sm3.update('data2');
      const hash = sm3.digest();

      const hashDirect = SM3.digest('data2');
      expect(hash).toBe(hashDirect);
    });

    it('should handle Uint8Array input', () => {
      const sm3 = new SM3();
      const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      sm3.update(data);
      const hash = sm3.digest();
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('SM4 分组密码', () => {
    const key = '0123456789abcdeffedcba9876543210';

    it('应该能够使用 ECB 模式加密和解密', () => {
      const sm4 = new SM4(key, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
      const plaintext = 'Hello, SM4!';

      const encrypted = sm4.encrypt(plaintext);
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = sm4.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够使用 CBC 模式加密和解密', () => {
      const iv = 'fedcba98765432100123456789abcdef';
      const sm4 = new SM4(key, { mode: CipherMode.CBC, padding: PaddingMode.PKCS7, iv });
      const plaintext = 'Hello, SM4 CBC!';

      const encrypted = sm4.encrypt(plaintext);
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = sm4.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够使用 ECB 工厂方法创建', () => {
      const sm4 = SM4.ECB(key);
      const plaintext = 'Hello';

      const encrypted = sm4.encrypt(plaintext);
      const decrypted = sm4.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够使用 CBC 工厂方法创建', () => {
      const iv = 'fedcba98765432100123456789abcdef';
      const sm4 = SM4.CBC(key, iv);
      const plaintext = 'Hello';

      const encrypted = sm4.encrypt(plaintext);
      const decrypted = sm4.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够获取和设置模式', () => {
      const sm4 = new SM4(key);
      expect(sm4.getMode()).toBe(CipherMode.ECB);

      sm4.setMode(CipherMode.CBC);
      expect(sm4.getMode()).toBe(CipherMode.CBC);
    });

    it('应该能够获取和设置填充', () => {
      const sm4 = new SM4(key);
      expect(sm4.getPadding()).toBe(PaddingMode.PKCS7);

      sm4.setPadding(PaddingMode.NONE);
      expect(sm4.getPadding()).toBe(PaddingMode.NONE);
    });

    it('应该能够获取和设置 IV', () => {
      const iv = 'fedcba98765432100123456789abcdef';
      const sm4 = new SM4(key);
      expect(sm4.getIV()).toBeUndefined();

      sm4.setIV(iv);
      expect(sm4.getIV()).toBe(iv);
    });

    it('应该能够处理 Uint8Array 输入', () => {
      const sm4 = SM4.ECB(key);
      const plaintext = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

      const encrypted = sm4.encrypt(plaintext);
      const decrypted = sm4.decrypt(encrypted);
      expect(decrypted).toBe('Hello');
    });

    it('应该能够使用 CTR 工厂方法创建', () => {
      const iv = '00000000000000000000000000000000';
      const sm4 = SM4.CTR(key, iv);
      const plaintext = 'Hello, CTR!';

      expect(sm4.getMode()).toBe(CipherMode.CTR);
      const encrypted = sm4.encrypt(plaintext);
      const decrypted = sm4.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够使用 CFB 工厂方法创建', () => {
      const iv = 'fedcba98765432100123456789abcdef';
      const sm4 = SM4.CFB(key, iv);
      const plaintext = 'Hello, CFB!';

      expect(sm4.getMode()).toBe(CipherMode.CFB);
      const encrypted = sm4.encrypt(plaintext);
      const decrypted = sm4.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('应该能够使用 OFB 工厂方法创建', () => {
      const iv = 'fedcba98765432100123456789abcdef';
      const sm4 = SM4.OFB(key, iv);
      const plaintext = 'Hello, OFB!';

      expect(sm4.getMode()).toBe(CipherMode.OFB);
      const encrypted = sm4.encrypt(plaintext);
      const decrypted = sm4.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('ZUC 流密码', () => {
    it('应该能够加密和解密数据', () => {
      const key = '00000000000000000000000000000000';
      const iv = '00000000000000000000000000000000';
      const zuc = new ZUC(key, iv);
      const plaintext = 'Hello, ZUC!';

      const encrypted = zuc.encrypt(plaintext);
      expect(encrypted).toBeTruthy();
      expect(encrypted).toMatch(/^[0-9a-f]+$/);

      const decrypted = zuc.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('应该允许更新 IV', () => {
      const key = '00112233445566778899aabbccddeeff';
      const iv1 = '00000000000000000000000000000000';
      const iv2 = 'ffffffffffffffffffffffffffffffff';
      const zuc = new ZUC(key, iv1);
      const plaintext = 'Test message';

      const encrypted1 = zuc.encrypt(plaintext);

      zuc.setIV(iv2);
      expect(zuc.getIV()).toBe(iv2);

      const encrypted2 = zuc.encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('应该能够生成密钥流', () => {
      const key = '00000000000000000000000000000000';
      const iv = '00000000000000000000000000000000';
      const zuc = new ZUC(key, iv);

      const keystream = zuc.keystream(4);
      expect(keystream).toHaveLength(32); // 4 words * 8 hex chars
      expect(keystream).toMatch(/^[0-9a-f]+$/);
    });

    it('应该支持 ZUC-128 静态工厂方法', () => {
      const key = 'ffffffffffffffffffffffffffffffff';
      const iv = '00000000000000000000000000000000';
      const zuc = ZUC.ZUC128(key, iv);
      const plaintext = 'Test';

      const encrypted = zuc.encrypt(plaintext);
      const decrypted = zuc.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('应该支持 EEA3 静态方法', () => {
      const key = '00000000000000000000000000000000';
      const count = 0x12345678;
      const bearer = 0x15;
      const direction = 0;
      const length = 128;

      const keystream = ZUC.eea3(key, count, bearer, direction, length);
      expect(keystream).toBeTruthy();
      expect(keystream).toMatch(/^[0-9a-f]+$/);
    });

    it('应该支持 EIA3 静态方法', () => {
      const key = '00000000000000000000000000000000';
      const count = 0x12345678;
      const bearer = 0x15;
      const direction = 0;
      const message = 'Test message';

      const mac = ZUC.eia3(key, count, bearer, direction, message);
      expect(mac).toBeTruthy();
      expect(mac).toHaveLength(8); // 32-bit MAC as 8 hex chars
      expect(mac).toMatch(/^[0-9a-f]+$/);
    });

    it('应该能够处理 Uint8Array 输入', () => {
      const key = new Uint8Array(16).fill(0);
      const iv = new Uint8Array(16).fill(1);
      const zuc = new ZUC(key, iv);
      const plaintext = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"

      const encrypted = zuc.encrypt(plaintext);
      expect(encrypted).toBeTruthy();

      const decrypted = zuc.decrypt(encrypted);
      expect(decrypted).toBe('Hello');
    });
  });
});
