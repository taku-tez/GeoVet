/**
 * GeoVet - Output Formatter
 */
import chalk from 'chalk';
export function formatResult(result, json = false) {
    if (json) {
        return JSON.stringify(result, null, 2);
    }
    if (result.error) {
        return `${chalk.red('✗')} ${result.input}: ${chalk.red(result.error)}`;
    }
    const parts = [];
    // Location line
    const location = [
        result.geo.city,
        result.geo.region,
        result.geo.countryCode || result.geo.country,
    ]
        .filter(Boolean)
        .join(', ');
    parts.push(`${chalk.green('✓')} ${chalk.bold(result.input)}`);
    if (result.input !== result.ip) {
        parts.push(`  ${chalk.dim('IP:')} ${result.ip}`);
    }
    if (location) {
        parts.push(`  ${chalk.dim('Location:')} ${location}`);
    }
    if (result.geo.latitude !== undefined && result.geo.longitude !== undefined) {
        parts.push(`  ${chalk.dim('Coordinates:')} ${result.geo.latitude.toFixed(4)}, ${result.geo.longitude.toFixed(4)}`);
    }
    if (result.geo.timezone) {
        parts.push(`  ${chalk.dim('Timezone:')} ${result.geo.timezone}`);
    }
    if (result.network?.asn) {
        parts.push(`  ${chalk.dim('Network:')} AS${result.network.asn} ${result.network.org || ''}`);
    }
    parts.push(`  ${chalk.dim('Provider:')} ${result.provider}`);
    return parts.join('\n');
}
export function formatResults(results, json = false) {
    if (json) {
        return JSON.stringify(results, null, 2);
    }
    return results.map((r) => formatResult(r, false)).join('\n\n');
}
export function formatSummary(results) {
    const total = results.length;
    const success = results.filter((r) => !r.error).length;
    const errors = total - success;
    // Country distribution
    const countries = new Map();
    for (const result of results) {
        if (!result.error) {
            const country = result.geo.countryCode || result.geo.country || 'Unknown';
            countries.set(country, (countries.get(country) || 0) + 1);
        }
    }
    const lines = ['', chalk.bold('Summary:')];
    lines.push(`  Total: ${total}, Success: ${chalk.green(success)}, Errors: ${errors > 0 ? chalk.red(errors) : errors}`);
    if (countries.size > 0) {
        lines.push('');
        lines.push(chalk.bold('  Countries:'));
        const sorted = [...countries.entries()].sort((a, b) => b[1] - a[1]);
        for (const [country, count] of sorted.slice(0, 10)) {
            const pct = ((count / success) * 100).toFixed(1);
            lines.push(`    ${country}: ${count} (${pct}%)`);
        }
        if (sorted.length > 10) {
            lines.push(`    ... and ${sorted.length - 10} more`);
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=formatter.js.map