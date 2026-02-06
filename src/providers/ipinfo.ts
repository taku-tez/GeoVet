/**
 * GeoVet - ipinfo.io Provider
 */

import type { GeoProvider, GeoResult } from '../types.js';

const API_BASE = 'https://ipinfo.io';
const TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createIpinfoProvider(apiKey?: string): GeoProvider {
  return {
    name: 'ipinfo',

    async isAvailable(): Promise<boolean> {
      // ipinfo.io works without API key (limited)
      return true;
    },

    async lookup(ip: string): Promise<GeoResult> {
      const url = apiKey
        ? `${API_BASE}/${ip}?token=${apiKey}`
        : `${API_BASE}/${ip}/json`;

      let lastError: string | undefined;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetchWithTimeout(
            url,
            {
              headers: {
                Accept: 'application/json',
                'User-Agent': 'GeoVet/0.3.0',
              },
            },
            TIMEOUT_MS
          );

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
            // Retry on 5xx errors
            if (response.status >= 500 && attempt < MAX_RETRIES) {
              lastError = `API error: ${response.status} ${response.statusText}`;
              await sleep(RETRY_DELAY_MS * (attempt + 1));
              continue;
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
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isTimeout = error instanceof Error && error.name === 'AbortError';
          
          // Retry on timeout or network errors
          if (attempt < MAX_RETRIES) {
            lastError = isTimeout ? 'Request timeout' : errorMessage;
            await sleep(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }

          return {
            input: ip,
            ip,
            geo: { ip },
            provider: 'ipinfo',
            error: `Request failed: ${lastError || errorMessage}`,
          };
        }
      }

      // Should not reach here, but just in case
      return {
        input: ip,
        ip,
        geo: { ip },
        provider: 'ipinfo',
        error: `Request failed after ${MAX_RETRIES + 1} attempts: ${lastError}`,
      };
    },
  };
}
