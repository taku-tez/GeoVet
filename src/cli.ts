#!/usr/bin/env node

/**
 * GeoVet - IP/Endpoint Geolocation CLI
 * 
 * ASM向け地理情報特定ツール
 */

import { program } from 'commander';
import { createInterface } from 'readline';
import { readFile } from 'fs/promises';
import { lookup, lookupBatch } from './lookup.js';
import { downloadDb, getDbStatus, formatDbStatus } from './db.js';
import { formatResult, formatResults, formatSummary } from './formatter.js';
import type { ProviderType, LookupOptions } from './types.js';

const VERSION = '0.1.0';

program
  .name('geovet')
  .description('IP/Endpoint Geolocation CLI - ASM向け地理情報特定ツール')
  .version(VERSION);

// lookup command
program
  .command('lookup')
  .description('Look up geolocation for IP addresses or domains')
  .argument('[targets...]', 'IP addresses or domains to look up')
  .option('-p, --provider <type>', 'Provider: local, ipinfo, auto', 'local')
  .option('-f, --file <path>', 'Read targets from file (one per line)')
  .option('--stdin', 'Read targets from stdin')
  .option('-j, --json', 'Output as JSON')
  .option('--summary', 'Show summary statistics')
  .option('-c, --concurrency <num>', 'Parallel lookups (default: 10, local: 50)', '10')
  .option('--progress', 'Show progress for large batches')
  .option('-v, --verbose', 'Verbose output')
  .action(async (targets: string[], options) => {
    const provider = options.provider as ProviderType;
    const lookupOptions: LookupOptions = {
      provider,
      json: options.json,
      verbose: options.verbose,
      apiKey: process.env.IPINFO_TOKEN,
      concurrency: parseInt(options.concurrency, 10) || 10,
    };

    let inputs: string[] = [...targets];

    // Read from file
    if (options.file) {
      try {
        const content = await readFile(options.file, 'utf-8');
        const fileTargets = content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));
        inputs.push(...fileTargets);
      } catch (error) {
        console.error(`Error reading file: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    }

    // Read from stdin
    if (options.stdin) {
      const rl = createInterface({
        input: process.stdin,
        terminal: false,
      });

      for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          inputs.push(trimmed);
        }
      }
    }

    if (inputs.length === 0) {
      console.error('No targets specified. Use: geovet lookup <ip|domain>');
      console.error('  or: geovet lookup -f targets.txt');
      console.error('  or: cat ips.txt | geovet lookup --stdin');
      process.exit(1);
    }

    // Progress callback
    if (options.progress && inputs.length > 1 && !options.json) {
      if (process.stderr.isTTY) {
        lookupOptions.onProgress = (completed, total) => {
          const pct = Math.round((completed / total) * 100);
          const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
          process.stderr.write(`\r${bar} ${pct}% (${completed}/${total})`);
        };
      } else {
        lookupOptions.onProgress = (completed, total) => {
          process.stderr.write(`Progress: ${completed}/${total}\n`);
        };
      }
    }

    // Perform lookups
    const results = await lookupBatch(inputs, lookupOptions);

    // Clear progress line
    if (options.progress && inputs.length > 1 && !options.json && process.stderr.isTTY) {
      process.stderr.write('\r' + ' '.repeat(50) + '\r');
    }

    // Output
    console.log(formatResults(results, options.json));

    if (options.summary && !options.json) {
      console.log(formatSummary(results));
    }

    // Exit with error if any lookups failed
    const hasErrors = results.some((r) => r.error);
    if (hasErrors) {
      process.exit(1);
    }
  });

// db command
const dbCmd = program
  .command('db')
  .description('Manage GeoLite2 database');

dbCmd
  .command('status')
  .description('Show database status')
  .action(async () => {
    const statuses = await getDbStatus();
    console.log(formatDbStatus(statuses));
  });

dbCmd
  .command('update')
  .description('Download/update GeoLite2 database')
  .option('-k, --license-key <key>', 'MaxMind license key (or set MAXMIND_LICENSE_KEY)')
  .action(async (options) => {
    const licenseKey = options.licenseKey || process.env.MAXMIND_LICENSE_KEY;

    if (!licenseKey) {
      console.error('License key required. Get one at https://www.maxmind.com/en/geolite2/signup');
      console.error('');
      console.error('Usage:');
      console.error('  geovet db update --license-key YOUR_KEY');
      console.error('  # or');
      console.error('  export MAXMIND_LICENSE_KEY=YOUR_KEY');
      console.error('  geovet db update');
      process.exit(1);
    }

    try {
      await downloadDb(licenseKey);
      console.log('');
      console.log('Database update complete!');
    } catch (error) {
      console.error(`Update failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// Parse and run
program.parse();
