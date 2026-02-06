/**
 * GeoVet - Types
 */

export interface GeoLocation {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  postalCode?: string;
}

export interface NetworkInfo {
  asn?: number;
  org?: string;
  isp?: string;
}

export interface GeoResult {
  input: string;
  ip: string;
  geo: GeoLocation;
  network?: NetworkInfo;
  provider: ProviderType;
  cached?: boolean;
  error?: string;
}

export type ProviderType = 'local' | 'ipinfo' | 'auto';

export interface LookupOptions {
  provider: ProviderType;
  json?: boolean;
  verbose?: boolean;
  dbPath?: string;
  apiKey?: string;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}

export interface GeoProvider {
  name: ProviderType;
  lookup(ip: string): Promise<GeoResult>;
  isAvailable(): Promise<boolean>;
}

export interface DbUpdateOptions {
  licenseKey?: string;
  force?: boolean;
}
