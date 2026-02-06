/**
 * GeoVet - CDN Detection
 *
 * Detect if an IP belongs to a CDN/Cloud provider
 */

export interface CdnInfo {
  isCdn: boolean;
  provider?: string;
  type?: 'cdn' | 'cloud' | 'hosting' | 'security';
  note?: string;
}

// Known CDN/Cloud provider ASNs
const CDN_ASNS: Record<number, { name: string; type: CdnInfo['type'] }> = {
  // === CDN ===
  // Cloudflare
  13335: { name: 'Cloudflare', type: 'cdn' },
  209242: { name: 'Cloudflare', type: 'cdn' },

  // Akamai
  20940: { name: 'Akamai', type: 'cdn' },
  16625: { name: 'Akamai', type: 'cdn' },
  32787: { name: 'Akamai', type: 'cdn' },
  12222: { name: 'Akamai', type: 'cdn' },
  17204: { name: 'Akamai', type: 'cdn' },
  18680: { name: 'Akamai', type: 'cdn' },
  18717: { name: 'Akamai', type: 'cdn' },
  23454: { name: 'Akamai', type: 'cdn' },
  23455: { name: 'Akamai', type: 'cdn' },
  24319: { name: 'Akamai', type: 'cdn' },
  26008: { name: 'Akamai', type: 'cdn' },
  30675: { name: 'Akamai', type: 'cdn' },
  31107: { name: 'Akamai', type: 'cdn' },
  31108: { name: 'Akamai', type: 'cdn' },
  31109: { name: 'Akamai', type: 'cdn' },
  31110: { name: 'Akamai', type: 'cdn' },
  33905: { name: 'Akamai', type: 'cdn' },
  34164: { name: 'Akamai', type: 'cdn' },
  35204: { name: 'Akamai', type: 'cdn' },
  36183: { name: 'Akamai', type: 'cdn' },
  39836: { name: 'Akamai', type: 'cdn' },
  43639: { name: 'Akamai', type: 'cdn' },
  55409: { name: 'Akamai', type: 'cdn' },
  55770: { name: 'Akamai', type: 'cdn' },
  133103: { name: 'Akamai', type: 'cdn' },

  // Fastly
  54113: { name: 'Fastly', type: 'cdn' },

  // Verizon Edgecast
  15133: { name: 'Verizon Edgecast', type: 'cdn' },

  // StackPath / MaxCDN
  12989: { name: 'StackPath', type: 'cdn' },
  30081: { name: 'StackPath', type: 'cdn' },

  // KeyCDN
  200651: { name: 'KeyCDN', type: 'cdn' },

  // Bunny CDN
  200325: { name: 'BunnyCDN', type: 'cdn' },

  // Limelight
  22822: { name: 'Limelight', type: 'cdn' },
  38622: { name: 'Limelight', type: 'cdn' },

  // CDNetworks
  36408: { name: 'CDNetworks', type: 'cdn' },

  // CacheFly (shares ASN with StackPath)

  // jsDelivr (uses multiple CDNs)
  205544: { name: 'jsDelivr', type: 'cdn' },

  // Sucuri
  30148: { name: 'Sucuri', type: 'cdn' },

  // ArvanCloud
  202468: { name: 'ArvanCloud', type: 'cdn' },

  // G-Core Labs
  199524: { name: 'G-Core Labs', type: 'cdn' },
  202422: { name: 'G-Core Labs', type: 'cdn' },

  // === CLOUD PROVIDERS ===
  // Amazon AWS / CloudFront
  16509: { name: 'Amazon CloudFront/AWS', type: 'cloud' },
  14618: { name: 'Amazon AWS', type: 'cloud' },
  8987: { name: 'Amazon AWS', type: 'cloud' },
  38895: { name: 'Amazon AWS', type: 'cloud' },

  // Google Cloud
  15169: { name: 'Google Cloud', type: 'cloud' },
  396982: { name: 'Google Cloud', type: 'cloud' },
  19527: { name: 'Google Cloud', type: 'cloud' },
  36039: { name: 'Google Cloud', type: 'cloud' },
  36040: { name: 'Google Cloud', type: 'cloud' },
  41264: { name: 'Google Cloud', type: 'cloud' },
  43515: { name: 'Google Cloud', type: 'cloud' },

  // Microsoft Azure
  8075: { name: 'Microsoft Azure', type: 'cloud' },
  8068: { name: 'Microsoft', type: 'cloud' },
  8069: { name: 'Microsoft', type: 'cloud' },
  12076: { name: 'Microsoft Azure', type: 'cloud' },

  // Alibaba Cloud
  45102: { name: 'Alibaba Cloud', type: 'cloud' },
  37963: { name: 'Alibaba Cloud', type: 'cloud' },
  45103: { name: 'Alibaba Cloud', type: 'cloud' },

  // Tencent Cloud
  45090: { name: 'Tencent Cloud', type: 'cloud' },
  132203: { name: 'Tencent Cloud', type: 'cloud' },

  // Oracle Cloud
  31898: { name: 'Oracle Cloud', type: 'cloud' },

  // IBM Cloud
  36351: { name: 'IBM Cloud', type: 'cloud' },
  2687: { name: 'IBM Cloud', type: 'cloud' },

  // DigitalOcean
  14061: { name: 'DigitalOcean', type: 'cloud' },

  // Linode / Akamai Cloud
  63949: { name: 'Linode', type: 'cloud' },

  // Vultr
  20473: { name: 'Vultr', type: 'cloud' },

  // OVH
  16276: { name: 'OVHcloud', type: 'cloud' },

  // Hetzner
  24940: { name: 'Hetzner', type: 'cloud' },

  // Scaleway
  12876: { name: 'Scaleway', type: 'cloud' },

  // UpCloud
  25697: { name: 'UpCloud', type: 'cloud' },

  // Sakura Internet (Japan)
  7684: { name: 'Sakura Internet', type: 'cloud' },
  9370: { name: 'Sakura Internet', type: 'cloud' },

  // GMO Internet (Japan)
  7506: { name: 'GMO Internet', type: 'cloud' },

  // IDCF (Japan)
  17511: { name: 'IDCF', type: 'cloud' },

  // NTT Communications (Japan)
  4713: { name: 'NTT Communications', type: 'cloud' },

  // KDDI (Japan)
  2516: { name: 'KDDI', type: 'cloud' },

  // IIJ (Japan)
  2497: { name: 'IIJ', type: 'cloud' },

  // Naver Cloud (Korea)
  23576: { name: 'Naver Cloud', type: 'cloud' },

  // === HOSTING / PAAS ===
  // Vercel
  209366: { name: 'Vercel', type: 'hosting' },

  // Netlify
  212481: { name: 'Netlify', type: 'hosting' },

  // Heroku (Salesforce)
  60626: { name: 'Heroku', type: 'hosting' },

  // Render
  397373: { name: 'Render', type: 'hosting' },

  // Fly.io
  40509: { name: 'Fly.io', type: 'hosting' },

  // Railway
  // (uses GCP)

  // GitHub Pages
  36459: { name: 'GitHub', type: 'hosting' },

  // GitLab
  56987: { name: 'GitLab', type: 'hosting' },

  // Squarespace
  53831: { name: 'Squarespace', type: 'hosting' },

  // Wix
  58113: { name: 'Wix', type: 'hosting' },

  // Shopify
  13413: { name: 'Shopify', type: 'hosting' },

  // WordPress.com / Automattic
  2635: { name: 'Automattic/WordPress.com', type: 'hosting' },

  // Pantheon
  62638: { name: 'Pantheon', type: 'hosting' },

  // WP Engine
  46664: { name: 'WP Engine', type: 'hosting' },

  // Kinsta
  395894: { name: 'Kinsta', type: 'hosting' },

  // === SECURITY / WAF ===
  // Imperva / Incapsula
  19551: { name: 'Imperva Incapsula', type: 'security' },

  // Sucuri (already listed above)

  // F5 / Silverline
  55002: { name: 'F5 Networks', type: 'security' },

  // Radware
  38621: { name: 'Radware', type: 'security' },

  // Neustar
  7786: { name: 'Neustar', type: 'security' },
  19905: { name: 'Neustar', type: 'security' },

  // Project Shield (Google)
  // (uses Google ASN)

  // Prolexic (Akamai) - already listed above
};

// Known CDN hostname patterns
const CDN_HOSTNAME_PATTERNS: Array<[RegExp, string, CdnInfo['type']]> = [
  // CDN
  [/\.cloudfront\.net$/i, 'Amazon CloudFront', 'cdn'],
  [/\.cloudflare\.com$/i, 'Cloudflare', 'cdn'],
  [/\.akamaiedge\.net$/i, 'Akamai', 'cdn'],
  [/\.akamai\.net$/i, 'Akamai', 'cdn'],
  [/\.akamaihd\.net$/i, 'Akamai', 'cdn'],
  [/\.edgesuite\.net$/i, 'Akamai', 'cdn'],
  [/\.edgekey\.net$/i, 'Akamai', 'cdn'],
  [/\.srip\.net$/i, 'Akamai', 'cdn'],
  [/\.akamaitechnologies\.com$/i, 'Akamai', 'cdn'],
  [/\.fastly\.net$/i, 'Fastly', 'cdn'],
  [/\.fastlylb\.net$/i, 'Fastly', 'cdn'],
  [/\.azureedge\.net$/i, 'Azure CDN', 'cdn'],
  [/\.vo\.msecnd\.net$/i, 'Azure CDN', 'cdn'],
  [/\.edgecastcdn\.net$/i, 'Verizon Edgecast', 'cdn'],
  [/\.systemcdn\.net$/i, 'Verizon Edgecast', 'cdn'],
  [/\.stackpathdns\.com$/i, 'StackPath', 'cdn'],
  [/\.stackpathcdn\.com$/i, 'StackPath', 'cdn'],
  [/\.kxcdn\.com$/i, 'KeyCDN', 'cdn'],
  [/\.b-cdn\.net$/i, 'BunnyCDN', 'cdn'],
  [/\.bunnycdn\.com$/i, 'BunnyCDN', 'cdn'],
  [/\.llnwd\.net$/i, 'Limelight', 'cdn'],
  [/\.lldns\.net$/i, 'Limelight', 'cdn'],
  [/\.cdnetworks\.net$/i, 'CDNetworks', 'cdn'],
  [/\.cachefly\.net$/i, 'CacheFly', 'cdn'],
  [/\.cdn77\.org$/i, 'CDN77', 'cdn'],
  [/\.jsdelivr\.net$/i, 'jsDelivr', 'cdn'],
  [/\.unpkg\.com$/i, 'unpkg', 'cdn'],
  [/\.cdnjs\.cloudflare\.com$/i, 'cdnjs', 'cdn'],
  [/\.gcore\.com$/i, 'G-Core Labs', 'cdn'],

  // Cloud
  [/\.amazonaws\.com$/i, 'Amazon AWS', 'cloud'],
  [/\.awsglobalaccelerator\.com$/i, 'AWS Global Accelerator', 'cloud'],
  [/\.elasticbeanstalk\.com$/i, 'AWS Elastic Beanstalk', 'cloud'],
  [/\.googleapis\.com$/i, 'Google Cloud', 'cloud'],
  [/\.googleusercontent\.com$/i, 'Google Cloud', 'cloud'],
  [/\.ghs\.googlehosted\.com$/i, 'Google', 'cloud'],
  [/\.run\.app$/i, 'Google Cloud Run', 'cloud'],
  [/\.appspot\.com$/i, 'Google App Engine', 'cloud'],
  [/\.firebaseapp\.com$/i, 'Firebase', 'cloud'],
  [/\.web\.app$/i, 'Firebase', 'cloud'],
  [/\.azure\.com$/i, 'Microsoft Azure', 'cloud'],
  [/\.azurewebsites\.net$/i, 'Azure App Service', 'cloud'],
  [/\.blob\.core\.windows\.net$/i, 'Azure Blob', 'cloud'],
  [/\.trafficmanager\.net$/i, 'Azure Traffic Manager', 'cloud'],
  [/\.cloudapp\.azure\.com$/i, 'Azure', 'cloud'],
  [/\.digitaloceanspaces\.com$/i, 'DigitalOcean', 'cloud'],
  [/\.ondigitalocean\.app$/i, 'DigitalOcean App Platform', 'cloud'],
  [/\.vultr\.com$/i, 'Vultr', 'cloud'],
  [/\.linode\.com$/i, 'Linode', 'cloud'],
  [/\.linodeobjects\.com$/i, 'Linode', 'cloud'],
  [/\.ovh\.net$/i, 'OVHcloud', 'cloud'],
  [/\.hetzner\.com$/i, 'Hetzner', 'cloud'],
  [/\.scaleway\.com$/i, 'Scaleway', 'cloud'],
  [/\.aliyuncs\.com$/i, 'Alibaba Cloud', 'cloud'],
  [/\.alicdn\.com$/i, 'Alibaba Cloud CDN', 'cloud'],
  [/\.myqcloud\.com$/i, 'Tencent Cloud', 'cloud'],
  [/\.oraclecloud\.com$/i, 'Oracle Cloud', 'cloud'],
  [/\.sakura\.ne\.jp$/i, 'Sakura Internet', 'cloud'],

  // Hosting
  [/\.vercel\.app$/i, 'Vercel', 'hosting'],
  [/\.now\.sh$/i, 'Vercel', 'hosting'],
  [/\.netlify\.app$/i, 'Netlify', 'hosting'],
  [/\.netlify\.com$/i, 'Netlify', 'hosting'],
  [/\.herokuapp\.com$/i, 'Heroku', 'hosting'],
  [/\.onrender\.com$/i, 'Render', 'hosting'],
  [/\.fly\.dev$/i, 'Fly.io', 'hosting'],
  [/\.railway\.app$/i, 'Railway', 'hosting'],
  [/\.github\.io$/i, 'GitHub Pages', 'hosting'],
  [/\.gitlab\.io$/i, 'GitLab Pages', 'hosting'],
  [/\.pages\.dev$/i, 'Cloudflare Pages', 'hosting'],
  [/\.workers\.dev$/i, 'Cloudflare Workers', 'hosting'],
  [/\.deno\.dev$/i, 'Deno Deploy', 'hosting'],
  [/\.squarespace\.com$/i, 'Squarespace', 'hosting'],
  [/\.wixsite\.com$/i, 'Wix', 'hosting'],
  [/\.myshopify\.com$/i, 'Shopify', 'hosting'],
  [/\.shopifypreview\.com$/i, 'Shopify', 'hosting'],
  [/\.wordpress\.com$/i, 'WordPress.com', 'hosting'],
  [/\.wpcomstaging\.com$/i, 'WordPress.com', 'hosting'],
  [/\.pantheonsite\.io$/i, 'Pantheon', 'hosting'],
  [/\.wpengine\.com$/i, 'WP Engine', 'hosting'],
  [/\.kinsta\.cloud$/i, 'Kinsta', 'hosting'],

  // Security
  [/\.incapdns\.net$/i, 'Imperva Incapsula', 'security'],
  [/\.impervadns\.net$/i, 'Imperva', 'security'],
  [/\.sucuri\.net$/i, 'Sucuri', 'security'],
];

// Known CDN IP ranges (CIDR prefixes for quick check)
const CDN_IP_PREFIXES: Array<[string, string, CdnInfo['type']]> = [
  // Cloudflare
  ['104.16.', 'Cloudflare', 'cdn'],
  ['104.17.', 'Cloudflare', 'cdn'],
  ['104.18.', 'Cloudflare', 'cdn'],
  ['104.19.', 'Cloudflare', 'cdn'],
  ['104.20.', 'Cloudflare', 'cdn'],
  ['104.21.', 'Cloudflare', 'cdn'],
  ['104.22.', 'Cloudflare', 'cdn'],
  ['104.23.', 'Cloudflare', 'cdn'],
  ['104.24.', 'Cloudflare', 'cdn'],
  ['104.25.', 'Cloudflare', 'cdn'],
  ['104.26.', 'Cloudflare', 'cdn'],
  ['104.27.', 'Cloudflare', 'cdn'],
  ['172.64.', 'Cloudflare', 'cdn'],
  ['172.65.', 'Cloudflare', 'cdn'],
  ['172.66.', 'Cloudflare', 'cdn'],
  ['172.67.', 'Cloudflare', 'cdn'],
  ['173.245.', 'Cloudflare', 'cdn'],
  ['103.21.', 'Cloudflare', 'cdn'],
  ['103.22.', 'Cloudflare', 'cdn'],
  ['103.31.', 'Cloudflare', 'cdn'],
  ['141.101.', 'Cloudflare', 'cdn'],
  ['108.162.', 'Cloudflare', 'cdn'],
  ['190.93.', 'Cloudflare', 'cdn'],
  ['188.114.', 'Cloudflare', 'cdn'],
  ['197.234.', 'Cloudflare', 'cdn'],
  ['198.41.', 'Cloudflare', 'cdn'],
  ['162.158.', 'Cloudflare', 'cdn'],
  ['131.0.72.', 'Cloudflare', 'cdn'],

  // Amazon CloudFront
  ['13.32.', 'Amazon CloudFront', 'cdn'],
  ['13.33.', 'Amazon CloudFront', 'cdn'],
  ['13.35.', 'Amazon CloudFront', 'cdn'],
  ['13.224.', 'Amazon CloudFront', 'cdn'],
  ['13.225.', 'Amazon CloudFront', 'cdn'],
  ['13.226.', 'Amazon CloudFront', 'cdn'],
  ['13.227.', 'Amazon CloudFront', 'cdn'],
  ['13.249.', 'Amazon CloudFront', 'cdn'],
  ['18.64.', 'Amazon CloudFront', 'cdn'],
  ['18.154.', 'Amazon CloudFront', 'cdn'],
  ['18.160.', 'Amazon CloudFront', 'cdn'],
  ['18.164.', 'Amazon CloudFront', 'cdn'],
  ['18.165.', 'Amazon CloudFront', 'cdn'],
  ['18.172.', 'Amazon CloudFront', 'cdn'],
  ['52.84.', 'Amazon CloudFront', 'cdn'],
  ['52.85.', 'Amazon CloudFront', 'cdn'],
  ['54.182.', 'Amazon CloudFront', 'cdn'],
  ['54.192.', 'Amazon CloudFront', 'cdn'],
  ['54.230.', 'Amazon CloudFront', 'cdn'],
  ['54.239.128.', 'Amazon CloudFront', 'cdn'],
  ['54.239.192.', 'Amazon CloudFront', 'cdn'],
  ['70.132.', 'Amazon CloudFront', 'cdn'],
  ['99.84.', 'Amazon CloudFront', 'cdn'],
  ['99.86.', 'Amazon CloudFront', 'cdn'],
  ['143.204.', 'Amazon CloudFront', 'cdn'],
  ['204.246.', 'Amazon CloudFront', 'cdn'],
  ['205.251.', 'Amazon CloudFront', 'cdn'],
  ['216.137.', 'Amazon CloudFront', 'cdn'],

  // Fastly
  ['151.101.', 'Fastly', 'cdn'],
  ['199.232.', 'Fastly', 'cdn'],

  // Vercel
  ['76.76.21.', 'Vercel', 'hosting'],
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
    const info = CDN_ASNS[asn];
    return {
      isCdn: true,
      provider: info.name,
      type: info.type,
      note: `Detected by ASN. Location shows ${info.type === 'cdn' ? 'edge server' : 'cloud region'}, not origin.`,
    };
  }

  // Check by hostname pattern
  if (hostname) {
    for (const [pattern, provider, type] of CDN_HOSTNAME_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          isCdn: true,
          provider,
          type,
          note: `Detected by hostname. Location shows ${type === 'cdn' ? 'edge server' : 'cloud region'}, not origin.`,
        };
      }
    }
  }

  // Check by IP prefix
  for (const [prefix, provider, type] of CDN_IP_PREFIXES) {
    if (ip.startsWith(prefix)) {
      return {
        isCdn: true,
        provider,
        type,
        note: `Detected by IP range. Location shows ${type === 'cdn' ? 'edge server' : 'cloud region'}, not origin.`,
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
  Object.values(CDN_ASNS).forEach((p) => providers.add(p.name));
  CDN_HOSTNAME_PATTERNS.forEach(([, p]) => providers.add(p));
  return [...providers].sort();
}

/**
 * Get count of detection rules
 */
export function getCdnRuleCount(): { asn: number; hostname: number; ip: number } {
  return {
    asn: Object.keys(CDN_ASNS).length,
    hostname: CDN_HOSTNAME_PATTERNS.length,
    ip: CDN_IP_PREFIXES.length,
  };
}
