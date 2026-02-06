/**
 * GeoVet - Lookup Engine
 */
import type { GeoResult, LookupOptions } from './types.js';
export declare function lookup(input: string, options: LookupOptions): Promise<GeoResult>;
export declare function lookupBatch(inputs: string[], options: LookupOptions): Promise<GeoResult[]>;
//# sourceMappingURL=lookup.d.ts.map