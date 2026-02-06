/**
 * GeoVet - Local Provider (GeoLite2)
 */

import { Reader, CityResponse, AsnResponse } from 'maxmind';
import { readFile, access, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { GeoProvider, GeoResult } from '../types.js';

const DEFAULT_DATA_DIR = join(homedir(), '.geovet');
const providerCache = new Map<string, GeoProvider>();

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function resolveDataDir(dbPath?: string): string {
  return dbPath ?? DEFAULT_DATA_DIR;
}

function createProviderForDataDir(dataDir: string): GeoProvider {
  const cityDbPath = join(dataDir, 'GeoLite2-City.mmdb');
  const asnDbPath = join(dataDir, 'GeoLite2-ASN.mmdb');

  let cityReader: Reader<CityResponse> | null = null;
  let asnReader: Reader<AsnResponse> | null = null;

  async function initReaders(): Promise<boolean> {
    if (cityReader) return true;

    try {
      if (!await fileExists(cityDbPath)) {
        return false;
      }

      const cityBuffer = await readFile(cityDbPath);
      cityReader = new Reader<CityResponse>(cityBuffer);

      if (await fileExists(asnDbPath)) {
        const asnBuffer = await readFile(asnDbPath);
        asnReader = new Reader<AsnResponse>(asnBuffer);
      }

      return true;
    } catch (error) {
      console.error('Failed to load GeoLite2 database:', error);
      return false;
    }
  }

  return {
    name: 'local',

    async isAvailable(): Promise<boolean> {
      return initReaders();
    },

    async lookup(ip: string): Promise<GeoResult> {
      const available = await initReaders();
      if (!available || !cityReader) {
        return {
          input: ip,
          ip,
          geo: { ip },
          provider: 'local',
          error: 'GeoLite2 database not found. Run: geovet db update',
        };
      }

      try {
        const cityResult = cityReader.get(ip);
        const asnResult = asnReader?.get(ip);

        if (!cityResult) {
          return {
            input: ip,
            ip,
            geo: { ip },
            provider: 'local',
            error: 'IP not found in database',
          };
        }

        const result: GeoResult = {
          input: ip,
          ip,
          geo: {
            ip,
            country: cityResult.country?.names?.en,
            countryCode: cityResult.country?.iso_code,
            region: cityResult.subdivisions?.[0]?.names?.en,
            city: cityResult.city?.names?.en,
            latitude: cityResult.location?.latitude,
            longitude: cityResult.location?.longitude,
            timezone: cityResult.location?.time_zone,
            postalCode: cityResult.postal?.code,
          },
          provider: 'local',
        };

        if (asnResult) {
          result.network = {
            asn: asnResult.autonomous_system_number,
            org: asnResult.autonomous_system_organization,
          };
        }

        return result;
      } catch (error) {
        return {
          input: ip,
          ip,
          geo: { ip },
          provider: 'local',
          error: `Lookup failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  };
}

export function createLocalProvider(dbPath?: string): GeoProvider {
  const dataDir = resolveDataDir(dbPath);
  const cached = providerCache.get(dataDir);
  if (cached) {
    return cached;
  }

  const provider = createProviderForDataDir(dataDir);
  providerCache.set(dataDir, provider);
  return provider;
}

export const localProvider: GeoProvider = createLocalProvider();

export function getDataDir(): string {
  return DEFAULT_DATA_DIR;
}

export async function ensureDataDir(): Promise<void> {
  await mkdir(DEFAULT_DATA_DIR, { recursive: true });
}
