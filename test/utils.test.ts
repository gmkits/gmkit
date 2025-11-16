import { describe, it, expect } from 'vitest';
import {
  hexToBytes,
  bytesToHex,
  base64ToBytes,
  bytesToBase64,
  stringToBytes,
  bytesToString,
  normalizeInput,
  xor,
  rotl,
} from '../src/core/utils';

describe('工具函数测试', () => {
  describe('hexToBytes 十六进制转字节', () => {
    it('应该能够将十六进制字符串转换为字节', () => {
      const hex = '48656c6c6f';
      const bytes = hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });

    it('应该能够处理 0x 前缀', () => {
      const hex = '0x48656c6c6f';
      const bytes = hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });

    it('应该能够处理奇数长度的十六进制字符串', () => {
      const hex = 'abc';
      const bytes = hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0x0a, 0xbc]));
    });
  });

  describe('bytesToHex 字节转十六进制', () => {
    it('应该能够将字节转换为小写十六进制字符串', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('48656c6c6f');
    });

    it('应该填充单数字十六进制值', () => {
      const bytes = new Uint8Array([0x01, 0x0a, 0xff]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('010aff');
    });
  });

  describe('base64ToBytes 和 bytesToBase64', () => {
    it('应该能够将字节编码为 base64', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const base64 = bytesToBase64(bytes);
      expect(base64).toBe('SGVsbG8=');
    });

    it('应该能够将 base64 解码为字节', () => {
      const base64 = 'SGVsbG8=';
      const bytes = base64ToBytes(base64);
      expect(bytes).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });

    it('应该能够处理往返转换', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const base64 = bytesToBase64(original);
      const decoded = base64ToBytes(base64);
      expect(decoded).toEqual(original);
    });

    it('应该能够处理空字节', () => {
      const bytes = new Uint8Array([]);
      const base64 = bytesToBase64(bytes);
      expect(base64).toBe('');
      const decoded = base64ToBytes(base64);
      expect(decoded).toEqual(new Uint8Array([]));
    });

    it('应该能够处理不同的填充场景', () => {
      // 1 byte -> 1 padding char
      const bytes1 = new Uint8Array([0x41]);
      const base64_1 = bytesToBase64(bytes1);
      expect(base64_1).toBe('QQ==');
      expect(base64ToBytes(base64_1)).toEqual(bytes1);

      // 2 bytes -> 2 padding chars
      const bytes2 = new Uint8Array([0x41, 0x42]);
      const base64_2 = bytesToBase64(bytes2);
      expect(base64_2).toBe('QUI=');
      expect(base64ToBytes(base64_2)).toEqual(bytes2);

      // 3 bytes -> no padding
      const bytes3 = new Uint8Array([0x41, 0x42, 0x43]);
      const base64_3 = bytesToBase64(bytes3);
      expect(base64_3).toBe('QUJD');
      expect(base64ToBytes(base64_3)).toEqual(bytes3);
    });
  });

  describe('stringToBytes 字符串转字节', () => {
    it('应该能够将 UTF-8 字符串转换为字节', () => {
      const str = 'Hello';
      const bytes = stringToBytes(str);
      expect(bytes).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });

    it('应该能够处理 Unicode 字符', () => {
      const str = '你好';
      const bytes = stringToBytes(str);
      expect(bytes.length).toBeGreaterThan(2);
    });
  });

  describe('bytesToString 字节转字符串', () => {
    it('应该能够将字节转换为 UTF-8 字符串', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const str = bytesToString(bytes);
      expect(str).toBe('Hello');
    });
  });

  describe('normalizeInput 规范化输入', () => {
    it('应该按原样返回 Uint8Array', () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const result = normalizeInput(bytes);
      expect(result).toBe(bytes);
    });

    it('应该能够将字符串转换为 Uint8Array', () => {
      const str = 'Hello';
      const result = normalizeInput(str);
      expect(result).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });
  });

  describe('xor 异或操作', () => {
    it('应该能够对两个数组进行异或', () => {
      const a = new Uint8Array([0xff, 0x00, 0xaa]);
      const b = new Uint8Array([0x0f, 0xf0, 0x55]);
      const result = xor(a, b);
      expect(result).toEqual(new Uint8Array([0xf0, 0xf0, 0xff]));
    });

    it('不同长度应该抛出错误', () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([1, 2, 3]);
      expect(() => xor(a, b)).toThrow();
    });
  });

  describe('rotl 循环左移', () => {
    it('应该能够正确地循环左移', () => {
      const value = 0b00000001000000000000000000000000;
      const result = rotl(value, 1);
      expect(result).toBe(0b00000010000000000000000000000000);
    });

    it('应该能够处理环绕', () => {
      const value = 0b10000000000000000000000000000000;
      const result = rotl(value, 1);
      expect(result).toBe(0b00000000000000000000000000000001);
    });
  });
});
