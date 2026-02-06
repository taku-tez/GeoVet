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
import type { Headers, Pack } from 'tar-stream';
import type { PassThrough } from 'stream';
import { getDataDir, ensureDataDir } from './providers/local.js';

const GEOLITE2_EDITIONS = ['GeoLite2-City', 'GeoLite2-ASN'] as const;
const DOWNLOAD_TIMEOUT_MS = 20000;
const DOWNLOAD_RETRIES = 2;

interface DbStatus {
  edition: string;
  path: string;
  exists: boolean;
  size?: number;
  modifiedAt?: Date;
}

export async function getDbStatus(): Promise<DbStatus[]> {
  const dataDir = getDataDir();
  const statuses: DbStatus[] = [];

  for (const edition of GEOLITE2_EDITIONS) {
    const path = join(dataDir, `${edition}.mmdb`);
    let exists = false;
    let size: number | undefined;
    let modifiedAt: Date | undefined;

    try {
      await access(path);
      exists = true;
      const stats = await stat(path);
      size = stats.size;
      modifiedAt = stats.mtime;
    } catch {
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

export async function downloadDb(licenseKey: string): Promise<void> {
  await ensureDataDir();
  const dataDir = getDataDir();

  for (const edition of GEOLITE2_EDITIONS) {
    const url = `https://download.maxmind.com/app/geoip_download?edition_id=${edition}&license_key=${licenseKey}&suffix=tar.gz`;
    const response = await fetchWithRetry(url, edition);

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
        } else {
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

async function fetchWithRetry(url: string, edition: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= DOWNLOAD_RETRIES; attempt += 1) {
    const attemptLabel = `(${attempt + 1}/${DOWNLOAD_RETRIES + 1})`;
    console.log(`Downloading ${edition} ${attemptLabel}...`);

    try {
      const response = await fetchWithTimeout(url, DOWNLOAD_TIMEOUT_MS);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid license key. Get one at https://www.maxmind.com/en/geolite2/signup');
        }

        if (response.status >= 500 && attempt < DOWNLOAD_RETRIES) {
          console.warn(`Server error ${response.status}. Retrying ${edition} download...`);
          continue;
        }

        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < DOWNLOAD_RETRIES) {
        console.warn(`Retrying ${edition} download after error: ${formatDownloadError(error)}`);
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Download failed');
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(
        `Download timed out after ${Math.round(timeoutMs / 1000)} seconds. Please check your connection and try again.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return 'name' in error && error.name === 'AbortError';
}

function formatDownloadError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

async function extractMmdb(tarPath: string, destDir: string, edition: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const extract = tarStream.extract();
    const targetFile = `${edition}.mmdb`;

    extract.on('entry', (header: Headers, stream: PassThrough, next: () => void) => {
      if (header.name.endsWith('.mmdb')) {
        const destPath = join(destDir, targetFile);
        const writeStream = createWriteStream(destPath);
        stream.pipe(writeStream);
        writeStream.on('finish', next);
        writeStream.on('error', reject);
      } else {
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

export function formatDbStatus(statuses: DbStatus[]): string {
  const lines: string[] = ['GeoLite2 Database Status:', ''];

  for (const status of statuses) {
    if (status.exists) {
      const size = status.size ? `${(status.size / 1024 / 1024).toFixed(1)} MB` : 'unknown';
      const modified = status.modifiedAt?.toLocaleDateString() ?? 'unknown';
      lines.push(`✓ ${status.edition}: ${size} (${modified})`);
    } else {
      lines.push(`✗ ${status.edition}: not installed`);
    }
  }

  lines.push('');
  lines.push(`Location: ${getDataDir()}`);

  return lines.join('\n');
}
