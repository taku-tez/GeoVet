/**
 * GeoVet - CDN Detection
 *
 * Detect if an IP belongs to a CDN/Cloud provider
 */

export interface CdnInfo {
  isCdn: boolean;
  provider?: string;
  note?: string;
}

// Known CDN/Cloud provider ASNs
const CDN_ASNS: Record<number, string> = {
  // Cloudflare
  13335: 'Cloudflare',
  209242: 'Cloudflare',

  // Amazon CloudFront / AWS
  16509: 'Amazon CloudFront',
  14618: 'Amazon AWS',
  8987: 'Amazon AWS',

  // Akamai
  20940: 'Akamai',
  16625: 'Akamai',
  32787: 'Akamai',

  // Fastly
  54113: 'Fastly',

  // Google Cloud CDN
  15169: 'Google',
  396982: 'Google',

  // Microsoft Azure CDN
  8075: 'Microsoft Azure',
  8068: 'Microsoft',

  // Cloudfront.net IP ranges (AS16509)
  // Verizon Edgecast
  15133: 'Verizon Edgecast',

  // StackPath / MaxCDN
  12989: 'StackPath',
  30081: 'StackPath',

  // KeyCDN
  200651: 'KeyCDN',

  // Bunny CDN
  200325: 'BunnyCDN',

  // Imperva / Incapsula
  19551: 'Imperva Incapsula',

  // Limelight
  22822: 'Limelight',

  // CDNetworks
  36408: 'CDNetworks',

  // Alibaba Cloud CDN
  45102: 'Alibaba Cloud',

  // Tencent Cloud
  45090: 'Tencent Cloud',
};

// Known CDN hostname patterns
const CDN_HOSTNAME_PATTERNS: Array<[RegExp, string]> = [
  [/\.cloudfront\.net$/i, 'Amazon CloudFront'],
  [/\.cloudflare\.com$/i, 'Cloudflare'],
  [/\.akamaiedge\.net$/i, 'Akamai'],
  [/\.akamai\.net$/i, 'Akamai'],
  [/\.fastly\.net$/i, 'Fastly'],
  [/\.azureedge\.net$/i, 'Azure CDN'],
  [/\.edgecastcdn\.net$/i, 'Verizon Edgecast'],
  [/\.stackpathdns\.com$/i, 'StackPath'],
  [/\.kxcdn\.com$/i, 'KeyCDN'],
  [/\.b-cdn\.net$/i, 'BunnyCDN'],
  [/\.incapdns\.net$/i, 'Imperva Incapsula'],
  [/\.llnwd\.net$/i, 'Limelight'],
  [/\.googleapis\.com$/i, 'Google Cloud'],
  [/\.ghs\.googlehosted\.com$/i, 'Google'],
];

// Known CDN IP ranges (CIDR prefixes for quick check)
const CDN_IP_PREFIXES: Array<[string, string]> = [
  // Cloudflare
  ['104.16.', 'Cloudflare'],
  ['104.17.', 'Cloudflare'],
  ['104.18.', 'Cloudflare'],
  ['104.19.', 'Cloudflare'],
  ['104.20.', 'Cloudflare'],
  ['104.21.', 'Cloudflare'],
  ['104.22.', 'Cloudflare'],
  ['104.23.', 'Cloudflare'],
  ['104.24.', 'Cloudflare'],
  ['104.25.', 'Cloudflare'],
  ['104.26.', 'Cloudflare'],
  ['104.27.', 'Cloudflare'],
  ['172.64.', 'Cloudflare'],
  ['172.65.', 'Cloudflare'],
  ['172.66.', 'Cloudflare'],
  ['172.67.', 'Cloudflare'],
  ['173.245.', 'Cloudflare'],
  ['103.21.', 'Cloudflare'],
  ['103.22.', 'Cloudflare'],
  ['103.31.', 'Cloudflare'],
  ['141.101.', 'Cloudflare'],
  ['108.162.', 'Cloudflare'],
  ['190.93.', 'Cloudflare'],
  ['188.114.', 'Cloudflare'],
  ['197.234.', 'Cloudflare'],
  ['198.41.', 'Cloudflare'],
  ['162.158.', 'Cloudflare'],
  ['131.0.72.', 'Cloudflare'],

  // Amazon CloudFront (partial)
  ['13.32.', 'Amazon CloudFront'],
  ['13.33.', 'Amazon CloudFront'],
  ['13.35.', 'Amazon CloudFront'],
  ['13.224.', 'Amazon CloudFront'],
  ['13.225.', 'Amazon CloudFront'],
  ['13.226.', 'Amazon CloudFront'],
  ['13.227.', 'Amazon CloudFront'],
  ['13.249.', 'Amazon CloudFront'],
  ['18.64.', 'Amazon CloudFront'],
  ['18.154.', 'Amazon CloudFront'],
  ['18.160.', 'Amazon CloudFront'],
  ['18.164.', 'Amazon CloudFront'],
  ['18.165.', 'Amazon CloudFront'],
  ['18.172.', 'Amazon CloudFront'],
  ['52.84.', 'Amazon CloudFront'],
  ['52.85.', 'Amazon CloudFront'],
  ['54.182.', 'Amazon CloudFront'],
  ['54.192.', 'Amazon CloudFront'],
  ['54.230.', 'Amazon CloudFront'],
  ['54.239.128.', 'Amazon CloudFront'],
  ['54.239.192.', 'Amazon CloudFront'],
  ['70.132.', 'Amazon CloudFront'],
  ['99.84.', 'Amazon CloudFront'],
  ['99.86.', 'Amazon CloudFront'],
  ['204.246.', 'Amazon CloudFront'],
  ['205.251.', 'Amazon CloudFront'],
  ['216.137.', 'Amazon CloudFront'],
];

/**
 * Detect if IP/ASN belongs to a CDN
 */
export function detectCdn(
  ip: string,
  asn?: number,
  hostname?: string
): CdnInfo {
  // Check by ASN first (most reliable)
  if (asn && CDN_ASNS[asn]) {
    return {
      isCdn: true,
      provider: CDN_ASNS[asn],
      note: 'Detected by ASN. Location shows edge server, not origin.',
    };
  }

  // Check by hostname pattern
  if (hostname) {
    for (const [pattern, provider] of CDN_HOSTNAME_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          isCdn: true,
          provider,
          note: 'Detected by hostname. Location shows edge server, not origin.',
        };
      }
    }
  }

  // Check by IP prefix
  for (const [prefix, provider] of CDN_IP_PREFIXES) {
    if (ip.startsWith(prefix)) {
      return {
        isCdn: true,
        provider,
        note: 'Detected by IP range. Location shows edge server, not origin.',
      };
    }
  }

  return { isCdn: false };
}

/**
 * Get list of known CDN providers
 */
export function getKnownCdnProviders(): string[] {
  const providers = new Set<string>();
  Object.values(CDN_ASNS).forEach((p) => providers.add(p));
  CDN_HOSTNAME_PATTERNS.forEach(([, p]) => providers.add(p));
  return [...providers].sort();
}
