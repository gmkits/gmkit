import { describe, it, expect } from 'vitest';
import {
  encodeInteger,
  decodeInteger,
  encodeSequence,
  decodeSequence,
  encodeSignature,
  decodeSignature,
  rawToDer,
  derToRaw,
  asn1ToXml,
  signatureToXml,
} from '../src/core/asn1';

describe('ASN.1 工具', () => {
  describe('整数编码/解码', () => {
    it('应该能够编码和解码小整数', () => {
      const encoded = encodeInteger('01');
      const { value } = decodeInteger(encoded);
      expect(Array.from(value).map(b => b.toString(16).padStart(2, '0')).join('')).toBe('01');
    });

    it('应该能够编码和解码大整数', () => {
      const bigInt = 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123';
      const encoded = encodeInteger(bigInt);
      const { value } = decodeInteger(encoded);
      const decoded = Array.from(value).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      expect(decoded).toBe(bigInt);
    });

    it('应该能够处理前导零', () => {
      const encoded = encodeInteger('0001');
      const { value } = decodeInteger(encoded);
      expect(Array.from(value).map(b => b.toString(16).padStart(2, '0')).join('')).toBe('01');
    });

    it('应该为高位设置添加填充', () => {
      const encoded = encodeInteger('FF');
      // Should have 0x02 (INTEGER tag), length, 0x00 (padding), 0xFF
      expect(encoded[0]).toBe(0x02);
      expect(encoded.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('序列编码/解码', () => {
    it('应该能够编码和解码空序列', () => {
      const encoded = encodeSequence();
      const { elements } = decodeSequence(encoded);
      expect(elements).toHaveLength(0);
    });

    it('应该能够编码和解码包含整数的序列', () => {
      const int1 = encodeInteger('01');
      const int2 = encodeInteger('02');
      const encoded = encodeSequence(int1, int2);

      expect(encoded[0]).toBe(0x30); // SEQUENCE tag

      const { elements } = decodeSequence(encoded);
      expect(elements).toHaveLength(2);
    });

    it('应该能够处理嵌套序列', () => {
      const int1 = encodeInteger('01');
      const inner = encodeSequence(int1);
      const outer = encodeSequence(inner);

      const { elements } = decodeSequence(outer);
      expect(elements).toHaveLength(1);
      expect(elements[0][0]).toBe(0x30); // Inner sequence tag
    });
  });

  describe('签名编码/解码', () => {
    it('应该能够编码和解码 SM2 签名', () => {
      const r = '32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7';
      const s = 'BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0';

      const encoded = encodeSignature(r, s);
      const decoded = decodeSignature(encoded);

      expect(decoded.r.toUpperCase()).toBe(r);
      expect(decoded.s.toUpperCase()).toBe(s);
    });

    it('应该能够处理带前导零的签名', () => {
      const r = '00C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7';
      const s = '00003736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0';

      const encoded = encodeSignature(r, s);
      const decoded = decodeSignature(encoded);

      // Leading zeros should be removed
      expect(decoded.r.length).toBeLessThanOrEqual(r.length);
      expect(decoded.s.length).toBeLessThanOrEqual(s.length);
    });
  });

  describe('原始格式/DER 格式转换', () => {
    it('应该能够将原始签名转换为 DER 格式', () => {
      const raw = '32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0';
      const der = rawToDer(raw);

      expect(der[0]).toBe(0x30); // SEQUENCE tag
      expect(der.length).toBeGreaterThan(64);
    });

    it('应该能够将 DER 签名转换为原始格式', () => {
      const r = '32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7';
      const s = 'BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0';
      const expected = r + s;

      const der = encodeSignature(r, s);
      const raw = derToRaw(der);

      expect(raw.toUpperCase()).toBe(expected);
    });

    it('应该能够完成原始格式到 DER 格式的往返转换', () => {
      const original = '32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0';
      const der = rawToDer(original);
      const raw = derToRaw(der);

      expect(raw.toUpperCase()).toBe(original.toUpperCase());
    });

    it('应该对无效的原始签名长度抛出错误', () => {
      expect(() => rawToDer('1234')).toThrow('Raw signature must be 64 bytes');
    });
  });

  describe('ASN.1 到 XML 转换', () => {
    it('应该能够将简单整数转换为 XML', () => {
      const encoded = encodeInteger('01');
      const xml = asn1ToXml(encoded);

      expect(xml).toContain('<INTEGER>');
      expect(xml).toContain('</INTEGER>');
      expect(xml).toContain('<value>01</value>');
    });

    it('应该能够将序列转换为 XML', () => {
      const int1 = encodeInteger('01');
      const int2 = encodeInteger('02');
      const encoded = encodeSequence(int1, int2);
      const xml = asn1ToXml(encoded);

      expect(xml).toContain('<SEQUENCE>');
      expect(xml).toContain('</SEQUENCE>');
      expect(xml).toContain('<INTEGER>');
    });

    it('应该能够将签名转换为 XML', () => {
      const r = '32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7';
      const s = 'BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0';

      const xml = signatureToXml(r + s, false);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<SM2Signature>');
      expect(xml).toContain('</SM2Signature>');
      expect(xml).toContain(`<r>${r.toLowerCase()}</r>`);
      expect(xml).toContain(`<s>${s.toLowerCase()}</s>`);
      expect(xml).toContain('<DER>');
      expect(xml).toContain('</DER>');
    });

    it('应该能够将 DER 签名转换为 XML', () => {
      const r = '32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7';
      const s = 'BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0';
      const der = encodeSignature(r, s);

      const xml = signatureToXml(der);

      expect(xml).toContain('<SM2Signature>');
      expect(xml).toContain(`<r>${r.toLowerCase()}</r>`);
      expect(xml).toContain(`<s>${s.toLowerCase()}</s>`);
    });
  });
});
