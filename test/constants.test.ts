import { describe, it, expect } from 'vitest';
import {
  OID,
  DEFAULT_USER_ID,
  CipherMode,
  PaddingMode,
  SM2CipherMode,
} from '../src/types/constants';

describe('常量测试', () => {
  describe('OID 对象标识符', () => {
    it('应该具有正确的 SM2 OID', () => {
      expect(OID.SM2).toBe('1.2.156.10197.1.301');
    });

    it('应该具有正确的 SM2_SM3 OID', () => {
      expect(OID.SM2_SM3).toBe('1.2.156.10197.1.501');
    });

    it('应该具有正确的 SM3 OID', () => {
      expect(OID.SM3).toBe('1.2.156.10197.1.401');
    });

    it('应该具有正确的 SM4 OID', () => {
      expect(OID.SM4).toBe('1.2.156.10197.1.104');
    });

    it('应该具有 EC_PUBLIC_KEY OID 用于 OpenSSL 1.x 兼容性参考', () => {
      expect(OID.EC_PUBLIC_KEY).toBe('1.2.840.10045.2.1');
    });
  });

  describe('DEFAULT_USER_ID 默认用户 ID', () => {
    it('应该具有正确的默认用户 ID', () => {
      expect(DEFAULT_USER_ID).toBe('1234567812345678');
    });
  });

  describe('CipherMode 密码模式', () => {
    it('应该包含所有密码模式', () => {
      expect(CipherMode.ECB).toBe('ecb');
      expect(CipherMode.CBC).toBe('cbc');
      expect(CipherMode.CTR).toBe('ctr');
      expect(CipherMode.CFB).toBe('cfb');
      expect(CipherMode.OFB).toBe('ofb');
      expect(CipherMode.GCM).toBe('gcm');
    });

    it('不应该暴露计划中但未实现的模式', () => {
      const modes = Object.values(CipherMode);
      expect(modes).not.toContain('ccm');
      expect(modes).not.toContain('xts');
    });
  });

  describe('PaddingMode 填充模式', () => {
    it('应该包含所有填充模式', () => {
      expect(PaddingMode.PKCS7).toBe('pkcs7');
      expect(PaddingMode.NONE).toBe('none');
    });
  });

  describe('SM2CipherMode SM2 密文模式', () => {
    it('应该包含所有 SM2 密文模式', () => {
      expect(SM2CipherMode.C1C3C2).toBe('C1C3C2');
      expect(SM2CipherMode.C1C2C3).toBe('C1C2C3');
    });
  });
});
