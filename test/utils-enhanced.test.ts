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
  bytes4ToUint32BE,
  uint32ToBytes4BE,
  isHexString,
  isBase64String,
  autoDecodeString,
} from '../src/core/utils';

describe('工具函数增强测试套件', () => {
  describe('bytes4ToUint32BE - 字节转32位大端整数', () => {
    it('应该正确转换全零字节', () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const result = bytes4ToUint32BE(bytes);
      expect(result).toBe(0);
    });

    it('应该正确转换全一字节', () => {
      const bytes = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
      const result = bytes4ToUint32BE(bytes);
      expect(result).toBe(0xffffffff);
    });

    it('应该正确转换典型值', () => {
      const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const result = bytes4ToUint32BE(bytes);
      expect(result).toBe(0x12345678);
    });

    it('应该支持带偏移量的转换', () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x12, 0x34, 0x56, 0x78]);
      const result = bytes4ToUint32BE(bytes, 2);
      expect(result).toBe(0x12345678);
    });

    it('应该正确处理边界值', () => {
      // 最大值
      const maxBytes = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
      expect(bytes4ToUint32BE(maxBytes)).toBe(4294967295);

      // 最小值
      const minBytes = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      expect(bytes4ToUint32BE(minBytes)).toBe(0);
    });

    it('应该正确处理高位设置的值', () => {
      const bytes = new Uint8Array([0x80, 0x00, 0x00, 0x00]);
      const result = bytes4ToUint32BE(bytes);
      expect(result).toBe(0x80000000);
    });
  });

  describe('uint32ToBytes4BE - 32位整数转大端字节', () => {
    it('应该正确转换零值', () => {
      const result = uint32ToBytes4BE(0);
      expect(result).toEqual(new Uint8Array([0x00, 0x00, 0x00, 0x00]));
    });

    it('应该正确转换最大值', () => {
      const result = uint32ToBytes4BE(0xffffffff);
      expect(result).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
    });

    it('应该正确转换典型值', () => {
      const result = uint32ToBytes4BE(0x12345678);
      expect(result).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78]));
    });

    it('应该能与 bytes4ToUint32BE 往返转换', () => {
      const values = [0, 1, 255, 256, 65535, 0x12345678, 0xffffffff, 0x80000000];
      
      for (const value of values) {
        const bytes = uint32ToBytes4BE(value);
        const decoded = bytes4ToUint32BE(bytes);
        expect(decoded).toBe(value);
      }
    });

    it('应该正确处理负数（作为无符号整数）', () => {
      // JavaScript 中 -1 >>> 0 = 4294967295
      const result = uint32ToBytes4BE(-1 >>> 0);
      expect(result).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
    });
  });

  describe('isHexString - 十六进制字符串检测', () => {
    it('应该识别有效的十六进制字符串', () => {
      expect(isHexString('0123456789abcdef')).toBe(true);
      expect(isHexString('0123456789ABCDEF')).toBe(true);
      expect(isHexString('aAbBcCdDeEfF')).toBe(true);
      expect(isHexString('00')).toBe(true);
      expect(isHexString('ff')).toBe(true);
      expect(isHexString('FF')).toBe(true);
    });

    it('应该拒绝无效的十六进制字符串', () => {
      expect(isHexString('')).toBe(false);
      expect(isHexString('g')).toBe(false);
      expect(isHexString('0x123')).toBe(false); // 带前缀
      expect(isHexString('123g')).toBe(false);
      expect(isHexString('hello')).toBe(false);
      expect(isHexString('12 34')).toBe(false); // 含空格
      expect(isHexString('12\n34')).toBe(false); // 含换行
    });

    it('应该拒绝特殊字符', () => {
      expect(isHexString('12-34')).toBe(false);
      expect(isHexString('12:34')).toBe(false);
      expect(isHexString('12.34')).toBe(false);
      expect(isHexString('12_34')).toBe(false);
    });

    it('应该处理边界情况', () => {
      expect(isHexString('0')).toBe(true); // 单个字符
      expect(isHexString('f'.repeat(1000))).toBe(true); // 长字符串
    });
  });

  describe('isBase64String - Base64字符串检测', () => {
    it('应该识别有效的 Base64 字符串', () => {
      expect(isBase64String('SGVsbG8=')).toBe(true);
      expect(isBase64String('SGVsbG8gV29ybGQ=')).toBe(true);
      expect(isBase64String('QUJD')).toBe(true);
      expect(isBase64String('QUI=')).toBe(true);
      expect(isBase64String('QQ==')).toBe(true);
    });

    it('应该识别无填充的 Base64 字符串', () => {
      expect(isBase64String('QUJD')).toBe(true); // 无填充
      expect(isBase64String('YWJjZGVm')).toBe(true);
    });

    it('应该识别包含特殊字符的 Base64', () => {
      expect(isBase64String('AB+/CD==')).toBe(true); // 包含 + 和 /
      expect(isBase64String('+++///')).toBe(true);
    });

    it('应该拒绝无效的 Base64 字符串', () => {
      expect(isBase64String('')).toBe(false);
      expect(isBase64String('Hello World')).toBe(false); // 含空格
      expect(isBase64String('Hello@World')).toBe(false); // 非法字符
      expect(isBase64String('SGVs=bG8=')).toBe(false); // = 不在末尾
      expect(isBase64String('=SGVsbG8=')).toBe(false); // = 在开头
    });

    it('应该拒绝特殊字符', () => {
      expect(isBase64String('AB-CD')).toBe(false);
      expect(isBase64String('AB_CD')).toBe(false);
      expect(isBase64String('AB.CD')).toBe(false);
      expect(isBase64String('AB:CD')).toBe(false);
    });

    it('应该处理边界情况', () => {
      expect(isBase64String('A')).toBe(true); // 单个字符
      expect(isBase64String('A'.repeat(1000))).toBe(true); // 长字符串
    });
  });

  describe('autoDecodeString - 自动检测解码', () => {
    it('应该自动解码十六进制字符串', () => {
      const hex = '48656c6c6f';
      const result = autoDecodeString(hex);
      expect(bytesToString(result)).toBe('Hello');
    });

    it('应该自动解码 Base64 字符串', () => {
      const base64 = 'SGVsbG8=';
      const result = autoDecodeString(base64);
      expect(bytesToString(result)).toBe('Hello');
    });

    it('应该优先检测十六进制', () => {
      // 'ABCD' 既是有效的十六进制，也是有效的 Base64
      const ambiguous = 'ABCD';
      const result = autoDecodeString(ambiguous);
      // 应该被解码为十六进制
      expect(result).toEqual(hexToBytes(ambiguous));
    });

    it('应该处理纯数字字符串为十六进制', () => {
      const numeric = '123456';
      const result = autoDecodeString(numeric);
      expect(result).toEqual(hexToBytes(numeric));
    });

    it('应该处理复杂的 Base64 字符串', () => {
      const base64 = 'SGVsbG8gV29ybGQh'; // "Hello World!"
      const result = autoDecodeString(base64);
      expect(bytesToString(result)).toBe('Hello World!');
    });
  });

  describe('边界条件和错误处理', () => {
    describe('hexToBytes 边界测试', () => {
      it('应该处理空字符串', () => {
        const result = hexToBytes('');
        expect(result).toEqual(new Uint8Array([]));
      });

      it('应该拒绝无效的十六进制字符', () => {
        expect(() => hexToBytes('gg')).toThrow();
        expect(() => hexToBytes('xyz')).toThrow();
      });

      it('应该处理奇数长度的十六进制（自动补零）', () => {
        const result = hexToBytes('f');
        expect(result).toEqual(new Uint8Array([0x0f]));
      });

      it('应该处理大写和小写混合', () => {
        const result = hexToBytes('aAbBcC');
        expect(result).toEqual(new Uint8Array([0xaa, 0xbb, 0xcc]));
      });
    });

    describe('base64ToBytes 边界测试', () => {
      it('应该处理空字符串', () => {
        const result = base64ToBytes('');
        expect(result).toEqual(new Uint8Array([]));
      });

      it('应该忽略空白字符', () => {
        const withWhitespace = 'SGVs\n bG8=';
        const withoutWhitespace = 'SGVsbG8=';
        expect(base64ToBytes(withWhitespace)).toEqual(base64ToBytes(withoutWhitespace));
      });

      it('应该处理不同填充长度', () => {
        // 无填充 (3 bytes)
        const noPadding = base64ToBytes('QUJD');
        expect(noPadding).toEqual(new Uint8Array([0x41, 0x42, 0x43]));

        // 一个填充 (2 bytes)
        const onePadding = base64ToBytes('QUI=');
        expect(onePadding).toEqual(new Uint8Array([0x41, 0x42]));

        // 两个填充 (1 byte)
        const twoPadding = base64ToBytes('QQ==');
        expect(twoPadding).toEqual(new Uint8Array([0x41]));
      });
    });

    describe('xor 边界测试', () => {
      it('应该处理空数组', () => {
        const a = new Uint8Array([]);
        const b = new Uint8Array([]);
        const result = xor(a, b);
        expect(result).toEqual(new Uint8Array([]));
      });

      it('应该处理单字节数组', () => {
        const a = new Uint8Array([0xff]);
        const b = new Uint8Array([0x0f]);
        const result = xor(a, b);
        expect(result).toEqual(new Uint8Array([0xf0]));
      });

      it('应该处理大数组', () => {
        const size = 1024;
        const a = new Uint8Array(size).fill(0xff);
        const b = new Uint8Array(size).fill(0x00);
        const result = xor(a, b);
        expect(result).toEqual(a);
      });

      it('自身异或应该得到零', () => {
        const a = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
        const result = xor(a, a);
        expect(result).toEqual(new Uint8Array([0x00, 0x00, 0x00, 0x00]));
      });
    });

    describe('rotl 边界测试', () => {
      it('应该处理零值', () => {
        expect(rotl(0, 1)).toBe(0);
        expect(rotl(0, 16)).toBe(0);
        expect(rotl(0, 31)).toBe(0);
      });

      it('应该处理零位移', () => {
        expect(rotl(0x12345678, 0)).toBe(0x12345678);
      });

      it('应该处理完整循环（32位）', () => {
        const value = 0x12345678;
        expect(rotl(value, 32)).toBe(value);
      });

      it('应该处理各种位移量', () => {
        const value = 0x80000000;
        expect(rotl(value, 1)).toBe(0x00000001);
        expect(rotl(value, 2)).toBe(0x00000002);
        expect(rotl(value, 16)).toBe(0x00008000);
      });

      it('应该保持位模式', () => {
        const value = 0b10101010101010101010101010101010;
        const rotated = rotl(value, 1);
        // 验证位数没有丢失
        expect(rotated).toBe(0b01010101010101010101010101010101);
      });
    });
  });

  describe('性能和内存测试', () => {
    it('应该能处理大型数据（1MB）', () => {
      const size = 1024 * 1024; // 1MB
      const data = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        data[i] = i & 0xff;
      }

      // 转换为十六进制并返回
      const hex = bytesToHex(data);
      expect(hex.length).toBe(size * 2);
      
      const decoded = hexToBytes(hex);
      expect(decoded).toEqual(data);
    });

    it('应该能处理大型 Base64 数据', () => {
      const size = 10000;
      const data = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        data[i] = i & 0xff;
      }

      const base64 = bytesToBase64(data);
      const decoded = base64ToBytes(base64);
      expect(decoded).toEqual(data);
    });
  });

  describe('往返转换测试', () => {
    it('十六进制往返转换应该保持数据完整性', () => {
      const testData = [
        new Uint8Array([]),
        new Uint8Array([0]),
        new Uint8Array([255]),
        new Uint8Array([0, 1, 2, 3, 4, 5]),
        new Uint8Array(Array.from({ length: 256 }, (_, i) => i)),
      ];

      for (const data of testData) {
        const hex = bytesToHex(data);
        const decoded = hexToBytes(hex);
        expect(decoded).toEqual(data);
      }
    });

    it('Base64 往返转换应该保持数据完整性', () => {
      const testData = [
        new Uint8Array([]),
        new Uint8Array([0]),
        new Uint8Array([255]),
        new Uint8Array([0, 1, 2]),
        new Uint8Array([0, 1, 2, 3]),
        new Uint8Array([0, 1, 2, 3, 4]),
        new Uint8Array(Array.from({ length: 100 }, (_, i) => i)),
      ];

      for (const data of testData) {
        const base64 = bytesToBase64(data);
        const decoded = base64ToBytes(base64);
        expect(decoded).toEqual(data);
      }
    });

    it('UTF-8 字符串往返转换应该保持数据完整性', () => {
      const testStrings = [
        '',
        'Hello',
        'Hello, World!',
        '你好',
        '世界',
        '🌍🌎🌏',
        'Mixed 中文 and English 😊',
        '\n\r\t',
        '特殊字符：!@#$%^&*()',
      ];

      for (const str of testStrings) {
        const bytes = stringToBytes(str);
        const decoded = bytesToString(bytes);
        expect(decoded).toBe(str);
      }
    });
  });

  describe('Unicode 和特殊字符处理', () => {
    it('应该正确处理 Emoji', () => {
      const emoji = '😊🎉🚀';
      const bytes = stringToBytes(emoji);
      const decoded = bytesToString(bytes);
      expect(decoded).toBe(emoji);
    });

    it('应该正确处理多字节 UTF-8 字符', () => {
      const chinese = '中华人民共和国';
      const bytes = stringToBytes(chinese);
      expect(bytes.length).toBeGreaterThan(chinese.length); // UTF-8 编码
      const decoded = bytesToString(bytes);
      expect(decoded).toBe(chinese);
    });

    it('应该正确处理混合字符', () => {
      const mixed = 'Hello 世界 🌍';
      const bytes = stringToBytes(mixed);
      const decoded = bytesToString(bytes);
      expect(decoded).toBe(mixed);
    });

    it('应该正确处理零宽字符', () => {
      const zeroWidth = 'a\u200Bb\u200Cc\u200Dd';
      const bytes = stringToBytes(zeroWidth);
      const decoded = bytesToString(bytes);
      expect(decoded).toBe(zeroWidth);
    });
  });
});
