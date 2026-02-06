/**
 * GeoVet - CDN Tests
 */

import { describe, it, expect } from 'vitest';
import { detectCdn } from './cdn.js';

describe('detectCdn IPv6 CIDR', () => {
  it('detects Cloudflare IPv6 range', () => {
    const result = detectCdn('2606:4700::6810:1');

    expect(result.isCdn).toBe(true);
    expect(result.provider).toBe('Cloudflare');
    expect(result.type).toBe('cdn');
  });

  it('detects CloudFront IPv6 range', () => {
    const result = detectCdn('2600:9000:abcd::1');

    expect(result.isCdn).toBe(true);
    expect(result.provider).toBe('Amazon CloudFront');
    expect(result.type).toBe('cdn');
  });

  it('does not match unrelated IPv6 ranges', () => {
    const result = detectCdn('2001:4860:4860::8888');

    expect(result.isCdn).toBe(false);
  });
});
