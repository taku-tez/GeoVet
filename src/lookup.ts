/**
 * GeoVet - Lookup Engine
 */

import { isIP } from 'net';
import { resolve4, resolve6 } from 'dns/promises';
import type { GeoResult, GeoProvider, LookupOptions, ProviderType } from './types.js';
import { localProvider } from './providers/local.js';
import { createIpinfoProvider } from './providers/ipinfo.js';
import { detectCdn } from './cdn.js';

function getProvider(type: ProviderType, apiKey?: string): GeoProvider {
  switch (type) {
    case 'local':
      return localProvider;
    case 'ipinfo':
      return createIpinfoProvider(apiKey);
    case 'auto':
      // Will be handled in lookup function
      return localProvider;
    default:
      throw new Error(`Unknown provider: ${type}`);
  }
}

async function resolveToIp(input: string): Promise<{ ip: string; error?: string }> {
  // Already an IP
  if (isIP(input)) {
    return { ip: input };
  }

  // Domain - resolve to IP
  try {
    const addresses = await resolve4(input);
    if (addresses.length > 0) {
      return { ip: addresses[0] };
    }
  } catch {
    // Try IPv6
    try {
      const addresses = await resolve6(input);
      if (addresses.length > 0) {
        return { ip: addresses[0] };
      }
    } catch {
      // Fall through
    }
  }

  return { ip: '', error: `Could not resolve: ${input}` };
}

export async function lookup(input: string, options: LookupOptions): Promise<GeoResult> {
  const { ip, error } = await resolveToIp(input);

  if (error || !ip) {
    return {
      input,
      ip: '',
      geo: { ip: '' },
      provider: options.provider,
      error: error || 'Failed to resolve IP',
    };
  }

  const apiKey = options.apiKey || process.env.IPINFO_TOKEN;
  let result: GeoResult;

  // Handle auto provider
  if (options.provider === 'auto') {
    // Try local first
    const local = localProvider;
    if (await local.isAvailable()) {
      const localResult = await local.lookup(ip);
      if (!localResult.error) {
        result = { ...localResult, input };
      } else {
        // Fallback to ipinfo
        const ipinfo = createIpinfoProvider(apiKey);
        result = { ...(await ipinfo.lookup(ip)), input };
      }
    } else {
      // Fallback to ipinfo
      const ipinfo = createIpinfoProvider(apiKey);
      result = { ...(await ipinfo.lookup(ip)), input };
    }
  } else {
    const provider = getProvider(options.provider, apiKey);
    result = { ...(await provider.lookup(ip)), input };
  }

  // Detect CDN
  if (!result.error) {
    const cdnInfo = detectCdn(
      result.ip,
      result.network?.asn,
      // Pass original input if it was a hostname
      isIP(input) ? undefined : input
    );
    if (cdnInfo.isCdn) {
      result.cdn = cdnInfo;
    }
  }

  return result;
}

/**
 * Process items with limited concurrency
 */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  let completed = 0;
  const total = items.length;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
      completed++;
      onProgress?.(completed, total);
    }
  }

  // Start workers
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

export async function lookupBatch(
  inputs: string[],
  options: LookupOptions
): Promise<GeoResult[]> {
  const effectiveConcurrency =
    options.provider === 'local' ? (options.concurrency ?? 50) : (options.concurrency ?? 10);

  return parallelMap(
    inputs,
    (input) => lookup(input, options),
    effectiveConcurrency,
    options.onProgress
  );
}
