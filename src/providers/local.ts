/**
 * GeoVet - Local Provider (GeoLite2)
 */

import { Reader, CityResponse, AsnResponse } from 'maxmind';
import { readFile, access, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { GeoProvider, GeoResult } from '../types.js';

const DATA_DIR = join(homedir(), '.geovet');
const CITY_DB = join(DATA_DIR, 'GeoLite2-City.mmdb');
const ASN_DB = join(DATA_DIR, 'GeoLite2-ASN.mmdb');

let cityReader: Reader<CityResponse> | null = null;
let asnReader: Reader<AsnResponse> | null = null;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function initReaders(): Promise<boolean> {
  if (cityReader) return true;

  try {
    if (!await fileExists(CITY_DB)) {
      return false;
    }

    const cityBuffer = await readFile(CITY_DB);
    cityReader = new Reader<CityResponse>(cityBuffer);

    if (await fileExists(ASN_DB)) {
      const asnBuffer = await readFile(ASN_DB);
      asnReader = new Reader<AsnResponse>(asnBuffer);
    }

    return true;
  } catch (error) {
    console.error('Failed to load GeoLite2 database:', error);
    return false;
  }
}

export const localProvider: GeoProvider = {
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

export function getDataDir(): string {
  return DATA_DIR;
}

export async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}
