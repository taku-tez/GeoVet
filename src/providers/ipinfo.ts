/**
 * GeoVet - ipinfo.io Provider
 */

import type { GeoProvider, GeoResult } from '../types.js';

const API_BASE = 'https://ipinfo.io';

export function createIpinfoProvider(apiKey?: string): GeoProvider {
  return {
    name: 'ipinfo',

    async isAvailable(): Promise<boolean> {
      // ipinfo.io works without API key (limited)
      return true;
    },

    async lookup(ip: string): Promise<GeoResult> {
      try {
        const url = apiKey
          ? `${API_BASE}/${ip}?token=${apiKey}`
          : `${API_BASE}/${ip}/json`;

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'GeoVet/0.1.0',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            return {
              input: ip,
              ip,
              geo: { ip },
              provider: 'ipinfo',
              error: 'Rate limit exceeded. Consider using --provider local or set IPINFO_TOKEN',
            };
          }
          return {
            input: ip,
            ip,
            geo: { ip },
            provider: 'ipinfo',
            error: `API error: ${response.status} ${response.statusText}`,
          };
        }

        const data = await response.json() as {
          ip: string;
          hostname?: string;
          city?: string;
          region?: string;
          country?: string;
          loc?: string;
          org?: string;
          postal?: string;
          timezone?: string;
        };

        const [lat, lon] = data.loc?.split(',').map(Number) ?? [undefined, undefined];

        // Parse ASN from org field (format: "AS13335 Cloudflare, Inc.")
        let asn: number | undefined;
        let org: string | undefined;
        if (data.org) {
          const match = data.org.match(/^AS(\d+)\s+(.*)$/);
          if (match) {
            asn = parseInt(match[1], 10);
            org = match[2];
          } else {
            org = data.org;
          }
        }

        return {
          input: ip,
          ip: data.ip,
          geo: {
            ip: data.ip,
            countryCode: data.country,
            region: data.region,
            city: data.city,
            latitude: lat,
            longitude: lon,
            timezone: data.timezone,
            postalCode: data.postal,
          },
          network: asn || org ? { asn, org } : undefined,
          provider: 'ipinfo',
        };
      } catch (error) {
        return {
          input: ip,
          ip,
          geo: { ip },
          provider: 'ipinfo',
          error: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  };
}
