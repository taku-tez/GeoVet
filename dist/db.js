/**
 * GeoVet - Database Management
 *
 * GeoLite2 database download and update
 */
import { createWriteStream, createReadStream } from 'fs';
import { access, stat, rm } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import tarStream from 'tar-stream';
import { getDataDir, ensureDataDir } from './providers/local.js';
const GEOLITE2_EDITIONS = ['GeoLite2-City', 'GeoLite2-ASN'];
export async function getDbStatus() {
    const dataDir = getDataDir();
    const statuses = [];
    for (const edition of GEOLITE2_EDITIONS) {
        const path = join(dataDir, `${edition}.mmdb`);
        let exists = false;
        let size;
        let modifiedAt;
        try {
            await access(path);
            exists = true;
            const stats = await stat(path);
            size = stats.size;
            modifiedAt = stats.mtime;
        }
        catch {
            // File doesn't exist
        }
        statuses.push({
            edition,
            path,
            exists,
            size,
            modifiedAt,
        });
    }
    return statuses;
}
export async function downloadDb(licenseKey) {
    await ensureDataDir();
    const dataDir = getDataDir();
    for (const edition of GEOLITE2_EDITIONS) {
        console.log(`Downloading ${edition}...`);
        const url = `https://download.maxmind.com/app/geoip_download?edition_id=${edition}&license_key=${licenseKey}&suffix=tar.gz`;
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid license key. Get one at https://www.maxmind.com/en/geolite2/signup');
            }
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }
        if (!response.body) {
            throw new Error('No response body');
        }
        // Save to temp file
        const tempPath = join(dataDir, `${edition}.tar.gz`);
        const fileStream = createWriteStream(tempPath);
        // Convert web stream to node stream
        const reader = response.body.getReader();
        const nodeStream = new ReadableStream({
            async pull(controller) {
                const { done, value } = await reader.read();
                if (done) {
                    controller.close();
                }
                else {
                    controller.enqueue(value);
                }
            },
        });
        // @ts-ignore - Node 18+ supports this
        await pipeline(nodeStream, fileStream);
        // Extract mmdb file from tar.gz
        console.log(`Extracting ${edition}...`);
        await extractMmdb(tempPath, dataDir, edition);
        // Cleanup temp file
        await rm(tempPath);
        console.log(`✓ ${edition} updated`);
    }
}
async function extractMmdb(tarPath, destDir, edition) {
    return new Promise((resolve, reject) => {
        const extract = tarStream.extract();
        const targetFile = `${edition}.mmdb`;
        extract.on('entry', (header, stream, next) => {
            if (header.name.endsWith('.mmdb')) {
                const destPath = join(destDir, targetFile);
                const writeStream = createWriteStream(destPath);
                stream.pipe(writeStream);
                writeStream.on('finish', next);
                writeStream.on('error', reject);
            }
            else {
                stream.resume();
                next();
            }
        });
        extract.on('finish', resolve);
        extract.on('error', reject);
        createReadStream(tarPath)
            .pipe(createGunzip())
            .pipe(extract);
    });
}
export function formatDbStatus(statuses) {
    const lines = ['GeoLite2 Database Status:', ''];
    for (const status of statuses) {
        if (status.exists) {
            const size = status.size ? `${(status.size / 1024 / 1024).toFixed(1)} MB` : 'unknown';
            const modified = status.modifiedAt?.toLocaleDateString() ?? 'unknown';
            lines.push(`✓ ${status.edition}: ${size} (${modified})`);
        }
        else {
            lines.push(`✗ ${status.edition}: not installed`);
        }
    }
    lines.push('');
    lines.push(`Location: ${getDataDir()}`);
    return lines.join('\n');
}
//# sourceMappingURL=db.js.map