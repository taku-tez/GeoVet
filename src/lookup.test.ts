/**
 * GeoVet - Lookup Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { lookup, lookupBatch } from './lookup.js';
import type { LookupOptions } from './types.js';

describe('lookup', () => {
  describe('with ipinfo provider', () => {
    const options: LookupOptions = {
      provider: 'ipinfo',
    };

    it('should resolve IP address', async () => {
      const result = await lookup('8.8.8.8', options);
      
      expect(result.ip).toBe('8.8.8.8');
      expect(result.input).toBe('8.8.8.8');
      expect(result.geo.countryCode).toBe('US');
      expect(result.provider).toBe('ipinfo');
      expect(result.error).toBeUndefined();
    });

    it('should resolve domain to IP', async () => {
      const result = await lookup('google.com', options);
      
      expect(result.input).toBe('google.com');
      expect(result.ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(result.geo.countryCode).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle invalid domain', async () => {
      const result = await lookup('invalid.nonexistent.tld', options);
      
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Could not resolve');
    });

    it('should parse ASN from org field', async () => {
      const result = await lookup('8.8.8.8', options);
      
      expect(result.network).toBeDefined();
      expect(result.network?.asn).toBe(15169);
      expect(result.network?.org).toBe('Google LLC');
    });
  });

  describe('lookupBatch', () => {
    it('should handle multiple targets', async () => {
      const options: LookupOptions = { provider: 'ipinfo' };
      const targets = ['8.8.8.8', '1.1.1.1'];
      
      const results = await lookupBatch(targets, options);
      
      expect(results).toHaveLength(2);
      expect(results[0].ip).toBe('8.8.8.8');
      expect(results[1].ip).toBe('1.1.1.1');
    });
  });

  describe('with local provider (no DB)', () => {
    it('should return error when DB not found', async () => {
      const options: LookupOptions = { provider: 'local' };
      const result = await lookup('8.8.8.8', options);
      
      // DB won't be installed in test env
      expect(result.error).toContain('GeoLite2 database not found');
    });
  });

  describe('IP validation', () => {
    it('should handle IPv4', async () => {
      const result = await lookup('192.168.1.1', { provider: 'ipinfo' });
      expect(result.ip).toBe('192.168.1.1');
    });

    it('should handle IPv6', async () => {
      const result = await lookup('2001:4860:4860::8888', { provider: 'ipinfo' });
      expect(result.ip).toBe('2001:4860:4860::8888');
    });
  });
});

describe('formatter', () => {
  it('placeholder', () => {
    // Formatter tests could be added here
    expect(true).toBe(true);
  });
});
