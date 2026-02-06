/**
 * GeoVet - Local Provider (GeoLite2)
 */
import { Reader } from 'maxmind';
import { readFile, access, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
const DATA_DIR = join(homedir(), '.geovet');
const CITY_DB = join(DATA_DIR, 'GeoLite2-City.mmdb');
const ASN_DB = join(DATA_DIR, 'GeoLite2-ASN.mmdb');
let cityReader = null;
let asnReader = null;
async function fileExists(path) {
    try {
        await access(path);
        return true;
    }
    catch {
        return false;
    }
}
async function initReaders() {
    if (cityReader)
        return true;
    try {
        if (!await fileExists(CITY_DB)) {
            return false;
        }
        const cityBuffer = await readFile(CITY_DB);
        cityReader = new Reader(cityBuffer);
        if (await fileExists(ASN_DB)) {
            const asnBuffer = await readFile(ASN_DB);
            asnReader = new Reader(asnBuffer);
        }
        return true;
    }
    catch (error) {
        console.error('Failed to load GeoLite2 database:', error);
        return false;
    }
}
export const localProvider = {
    name: 'local',
    async isAvailable() {
        return initReaders();
    },
    async lookup(ip) {
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
            const result = {
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
        }
        catch (error) {
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
export function getDataDir() {
    return DATA_DIR;
}
export async function ensureDataDir() {
    await mkdir(DATA_DIR, { recursive: true });
}
//# sourceMappingURL=local.js.map