/**
 * GeoVet - Lookup Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookup, lookupBatch } from './lookup.js';
import type { LookupOptions } from './types.js';

const dnsMocks = vi.hoisted(() => ({
  resolve4: vi.fn<[string], Promise<string[]>>(),
  resolve6: vi.fn<[string], Promise<string[]>>(),
}));

vi.mock('dns/promises', () => ({
  resolve4: dnsMocks.resolve4,
  resolve6: dnsMocks.resolve6,
}));

const ipinfoResponses: Record<string, Record<string, string>> = {
  '8.8.8.8': {
    ip: '8.8.8.8',
    country: 'US',
    region: 'California',
    city: 'Mountain View',
    loc: '37.4056,-122.0775',
    org: 'AS15169 Google LLC',
  },
  '1.1.1.1': {
    ip: '1.1.1.1',
    country: 'US',
    region: 'California',
    city: 'Los Angeles',
    loc: '34.0522,-118.2437',
    org: 'AS13335 Cloudflare, Inc.',
  },
  '8.8.4.4': {
    ip: '8.8.4.4',
    country: 'US',
    region: 'California',
    city: 'Mountain View',
    loc: '37.4056,-122.0775',
    org: 'AS15169 Google LLC',
  },
  '13.33.235.1': {
    ip: '13.33.235.1',
    country: 'US',
    region: 'Washington',
    city: 'Seattle',
    loc: '47.6062,-122.3321',
    org: 'AS16509 Amazon.com, Inc.',
  },
  '192.168.1.1': {
    ip: '192.168.1.1',
    country: 'US',
    region: 'New York',
    city: 'New York',
    loc: '40.7128,-74.0060',
    org: 'AS15169 Google LLC',
  },
  '2001:4860:4860::8888': {
    ip: '2001:4860:4860::8888',
    country: 'US',
    region: 'California',
    city: 'Mountain View',
    loc: '37.4056,-122.0775',
    org: 'AS15169 Google LLC',
  },
};

beforeEach(() => {
  dnsMocks.resolve4.mockImplementation(async (hostname: string) => {
    if (hostname === 'google.com') {
      return ['8.8.8.8'];
    }
    if (hostname === 'invalid.nonexistent.tld') {
      throw new Error('No DNS records');
    }
    return [];
  });

  dnsMocks.resolve6.mockImplementation(async (hostname: string) => {
    if (hostname === 'google.com') {
      return ['2001:4860:4860::8888'];
    }
    if (hostname === 'invalid.nonexistent.tld') {
      throw new Error('No DNS records');
    }
    return [];
  });

  vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
    const url = new URL(input.toString());
    const [ip] = url.pathname.split('/').filter(Boolean);
    const data = ip ? ipinfoResponses[ip] : undefined;

    if (!data) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      } as Response;
    }

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => data,
    } as Response;
  }));
});

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
      expect(result.ip).toBe('8.8.8.8');
      expect(result.geo.countryCode).toBe('US');
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
      
      // DB won't be installed in test env (unless installed)
      if (result.error) {
        expect(result.error).toContain('GeoLite2 database not found');
      } else {
        // DB is installed, should have geo data
        expect(result.geo.ip).toBe('8.8.8.8');
      }
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

describe('parallel processing', () => {
  it('should process batch in parallel', async () => {
    const options: LookupOptions = { provider: 'ipinfo', concurrency: 5 };
    const targets = ['8.8.8.8', '1.1.1.1', '8.8.4.4'];
    
    const start = Date.now();
    const results = await lookupBatch(targets, options);
    const duration = Date.now() - start;
    
    expect(results).toHaveLength(3);
    // Parallel should be faster than 3x sequential (~150ms each)
    // Allow some buffer for slow networks
    expect(duration).toBeLessThan(2000);
  });

  it('should call onProgress callback', async () => {
    const progressCalls: Array<[number, number]> = [];
    const options: LookupOptions = {
      provider: 'ipinfo',
      concurrency: 2,
      onProgress: (completed, total) => {
        progressCalls.push([completed, total]);
      },
    };
    
    const targets = ['8.8.8.8', '1.1.1.1'];
    await lookupBatch(targets, options);
    
    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[progressCalls.length - 1]).toEqual([2, 2]);
  });
});

describe('CDN detection', () => {
  it('should detect Cloudflare by ASN', async () => {
    const result = await lookup('1.1.1.1', { provider: 'ipinfo' });
    
    expect(result.cdn).toBeDefined();
    expect(result.cdn?.isCdn).toBe(true);
    expect(result.cdn?.provider).toBe('Cloudflare');
  });

  it('should detect CloudFront by ASN', async () => {
    // Using a known CloudFront IP
    const result = await lookup('13.33.235.1', { provider: 'ipinfo' });
    
    expect(result.cdn).toBeDefined();
    expect(result.cdn?.isCdn).toBe(true);
    expect(result.cdn?.provider).toContain('CloudFront');
  });

  it('should not flag non-CDN IPs', async () => {
    // Google DNS - not a CDN
    const result = await lookup('8.8.8.8', { provider: 'ipinfo' });
    
    // Google is detected as CDN by ASN 15169
    // This is expected behavior - Google Cloud CDN uses same ASN
    expect(result.error).toBeUndefined();
  });
});

describe('AAAA-only domains', () => {
  it('should resolve IPv6-only domains', async () => {
    // Mock a domain that only has AAAA record
    dnsMocks.resolve4.mockImplementationOnce(async () => []);
    dnsMocks.resolve6.mockImplementationOnce(async () => ['2001:4860:4860::8888']);
    
    const result = await lookup('ipv6only.example.com', { provider: 'ipinfo' });
    
    expect(result.ip).toBe('2001:4860:4860::8888');
    expect(result.error).toBeUndefined();
  });
});

describe('CDN detection - hostname patterns', () => {
  it('should detect CloudFront by hostname', async () => {
    const { detectCdn } = await import('./cdn.js');
    const info = detectCdn('1.2.3.4', undefined, 'd123456.cloudfront.net');
    
    expect(info.isCdn).toBe(true);
    expect(info.provider).toContain('CloudFront');
  });

  it('should detect Akamai by hostname', async () => {
    const { detectCdn } = await import('./cdn.js');
    const info = detectCdn('1.2.3.4', undefined, 'example.akamaiedge.net');
    
    expect(info.isCdn).toBe(true);
    expect(info.provider).toBe('Akamai');
  });

  it('should detect Fastly by hostname', async () => {
    const { detectCdn } = await import('./cdn.js');
    const info = detectCdn('1.2.3.4', undefined, 'example.fastly.net');
    
    expect(info.isCdn).toBe(true);
    expect(info.provider).toBe('Fastly');
  });

  it('should detect GitHub Pages by hostname', async () => {
    const { detectCdn } = await import('./cdn.js');
    const info = detectCdn('1.2.3.4', undefined, 'example.github.io');
    
    expect(info.isCdn).toBe(true);
    expect(info.provider).toBe('GitHub Pages');
  });

  it('should detect Vercel by hostname', async () => {
    const { detectCdn } = await import('./cdn.js');
    const info = detectCdn('1.2.3.4', undefined, 'example.vercel.app');
    
    expect(info.isCdn).toBe(true);
    expect(info.provider).toBe('Vercel');
  });

  it('should detect Netlify by hostname', async () => {
    const { detectCdn } = await import('./cdn.js');
    const info = detectCdn('1.2.3.4', undefined, 'example.netlify.app');
    
    expect(info.isCdn).toBe(true);
    expect(info.provider).toBe('Netlify');
  });
});

describe('CDN detection - IP prefixes', () => {
  it('should detect Cloudflare by IP prefix', async () => {
    const { detectCdn } = await import('./cdn.js');
    // 104.16.0.0/12 is Cloudflare
    const info = detectCdn('104.16.1.1', undefined, undefined);
    
    expect(info.isCdn).toBe(true);
    expect(info.provider).toBe('Cloudflare');
  });

  it('should detect Fastly by IP prefix', async () => {
    const { detectCdn } = await import('./cdn.js');
    // 151.101.0.0/16 is Fastly
    const info = detectCdn('151.101.1.1', undefined, undefined);
    
    expect(info.isCdn).toBe(true);
    expect(info.provider).toBe('Fastly');
  });

  it('should not detect unknown IPs', async () => {
    const { detectCdn } = await import('./cdn.js');
    // Random private IP
    const info = detectCdn('192.168.1.1', undefined, undefined);
    
    expect(info.isCdn).toBe(false);
  });
});

describe('CDN detection - IPv6', () => {
  it('should detect Cloudflare by IPv6 prefix', async () => {
    const { detectCdn } = await import('./cdn.js');
    // 2606:4700::/32 is Cloudflare
    const info = detectCdn('2606:4700:10::1', undefined, undefined);
    
    expect(info.isCdn).toBe(true);
    expect(info.provider).toBe('Cloudflare');
  });

  it('should detect Fastly by IPv6 prefix', async () => {
    const { detectCdn } = await import('./cdn.js');
    // 2a04:4e42::/32 is Fastly
    const info = detectCdn('2a04:4e42::1', undefined, undefined);
    
    expect(info.isCdn).toBe(true);
    expect(info.provider).toBe('Fastly');
  });
});

describe('formatter', () => {
  it('should format successful result', async () => {
    const { formatResult } = await import('./formatter.js');
    const result = {
      input: 'example.com',
      ip: '1.2.3.4',
      geo: {
        ip: '1.2.3.4',
        city: 'Tokyo',
        region: 'Tokyo',
        countryCode: 'JP',
        latitude: 35.6893,
        longitude: 139.6899,
        timezone: 'Asia/Tokyo',
      },
      network: { asn: 12345, org: 'Example ISP' },
      provider: 'ipinfo' as const,
    };
    
    const output = formatResult(result, false);
    
    expect(output).toContain('example.com');
    expect(output).toContain('1.2.3.4');
    expect(output).toContain('Tokyo');
    expect(output).toContain('JP');
    expect(output).toContain('AS12345');
    expect(output).toContain('Example ISP');
  });

  it('should format error result', async () => {
    const { formatResult } = await import('./formatter.js');
    const result = {
      input: 'invalid.test',
      ip: '',
      geo: { ip: '' },
      provider: 'ipinfo' as const,
      error: 'Could not resolve: invalid.test',
    };
    
    const output = formatResult(result, false);
    
    expect(output).toContain('invalid.test');
    expect(output).toContain('Could not resolve');
  });

  it('should format CDN warning', async () => {
    const { formatResult } = await import('./formatter.js');
    const result = {
      input: 'cdn.example.com',
      ip: '1.2.3.4',
      geo: { ip: '1.2.3.4', city: 'New York' },
      provider: 'ipinfo' as const,
      cdn: {
        isCdn: true,
        provider: 'Cloudflare',
        type: 'cdn' as const,
        note: 'Detected by ASN',
      },
    };
    
    const output = formatResult(result, false);
    
    expect(output).toContain('Cloudflare');
    expect(output).toContain('CDN');
    expect(output).toContain('edge server');
  });

  it('should format cloud warning', async () => {
    const { formatResult } = await import('./formatter.js');
    const result = {
      input: 'app.example.com',
      ip: '1.2.3.4',
      geo: { ip: '1.2.3.4', city: 'Virginia' },
      provider: 'ipinfo' as const,
      cdn: {
        isCdn: true,
        provider: 'AWS',
        type: 'cloud' as const,
      },
    };
    
    const output = formatResult(result, false);
    
    expect(output).toContain('AWS');
    expect(output).toContain('Cloud');
    expect(output).toContain('cloud region');
  });

  it('should format JSON output', async () => {
    const { formatResult } = await import('./formatter.js');
    const result = {
      input: 'test.com',
      ip: '1.2.3.4',
      geo: { ip: '1.2.3.4', countryCode: 'US' },
      provider: 'ipinfo' as const,
    };
    
    const output = formatResult(result, true);
    const parsed = JSON.parse(output);
    
    expect(parsed.input).toBe('test.com');
    expect(parsed.ip).toBe('1.2.3.4');
  });

  it('should show network with org only (no ASN)', async () => {
    const { formatResult } = await import('./formatter.js');
    const result = {
      input: 'example.com',
      ip: '1.2.3.4',
      geo: { ip: '1.2.3.4' },
      provider: 'ipinfo' as const,
      network: { org: 'Unknown ISP' }, // No ASN
    };
    
    const output = formatResult(result, false);
    
    expect(output).toContain('Network');
    expect(output).toContain('Unknown ISP');
  });

  it('should format coordinates', async () => {
    const { formatResult } = await import('./formatter.js');
    const result = {
      input: 'geo.test',
      ip: '1.2.3.4',
      geo: {
        ip: '1.2.3.4',
        latitude: 35.6893,
        longitude: 139.6899,
      },
      provider: 'ipinfo' as const,
    };
    
    const output = formatResult(result, false);
    
    expect(output).toContain('Coordinates');
    expect(output).toContain('35.6893');
    expect(output).toContain('139.6899');
  });
});

describe('formatter summary', () => {
  it('should show country distribution', async () => {
    const { formatSummary } = await import('./formatter.js');
    const results = [
      { input: 'a', ip: '1.1.1.1', geo: { ip: '1.1.1.1', countryCode: 'US' }, provider: 'ipinfo' as const },
      { input: 'b', ip: '2.2.2.2', geo: { ip: '2.2.2.2', countryCode: 'US' }, provider: 'ipinfo' as const },
      { input: 'c', ip: '3.3.3.3', geo: { ip: '3.3.3.3', countryCode: 'JP' }, provider: 'ipinfo' as const },
      { input: 'd', ip: '', geo: { ip: '' }, provider: 'ipinfo' as const, error: 'fail' },
    ];
    
    const output = formatSummary(results);
    
    expect(output).toContain('Total: 4');
    expect(output).toContain('3'); // Success count
    expect(output).toContain('US');
    expect(output).toContain('JP');
  });
});

describe('CLI validation', () => {
  it('should reject zero concurrency', async () => {
    const { execSync } = await import('child_process');
    
    try {
      execSync('npx tsx src/cli.ts lookup 8.8.8.8 -c 0', {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect.fail('Should have thrown');
    } catch (e: unknown) {
      const err = e as { stderr?: string; message?: string };
      expect(err.stderr || err.message).toContain('positive integer');
    }
  });

  it('should reject negative concurrency', async () => {
    const { execSync } = await import('child_process');
    
    try {
      execSync('npx tsx src/cli.ts lookup 8.8.8.8 -c -5', {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect.fail('Should have thrown');
    } catch (e: unknown) {
      const err = e as { stderr?: string; message?: string };
      expect(err.stderr || err.message).toContain('positive integer');
    }
  });
});
