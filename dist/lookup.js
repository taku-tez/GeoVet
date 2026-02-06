/**
 * GeoVet - Lookup Engine
 */
import { isIP } from 'net';
import { resolve4, resolve6 } from 'dns/promises';
import { localProvider } from './providers/local.js';
import { createIpinfoProvider } from './providers/ipinfo.js';
function getProvider(type, apiKey) {
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
async function resolveToIp(input) {
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
    }
    catch {
        // Try IPv6
        try {
            const addresses = await resolve6(input);
            if (addresses.length > 0) {
                return { ip: addresses[0] };
            }
        }
        catch {
            // Fall through
        }
    }
    return { ip: '', error: `Could not resolve: ${input}` };
}
export async function lookup(input, options) {
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
    // Handle auto provider
    if (options.provider === 'auto') {
        // Try local first
        const local = localProvider;
        if (await local.isAvailable()) {
            const result = await local.lookup(ip);
            if (!result.error) {
                return { ...result, input };
            }
        }
        // Fallback to ipinfo
        const ipinfo = createIpinfoProvider(apiKey);
        const result = await ipinfo.lookup(ip);
        return { ...result, input };
    }
    const provider = getProvider(options.provider, apiKey);
    const result = await provider.lookup(ip);
    return { ...result, input };
}
export async function lookupBatch(inputs, options) {
    const results = [];
    for (const input of inputs) {
        const result = await lookup(input, options);
        results.push(result);
    }
    return results;
}
//# sourceMappingURL=lookup.js.map