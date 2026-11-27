/**
 * Clawd Connectors — Sunrise
 * Read-only client for the Sunrise (Backpack Securities tokenized equities)
 * snapshot served by the Sun board at https://sun.clawdcompute.us/api/sunrise
 * — the same snapshot the equities MCP's equities_sunrise_* tools read.
 * The snapshot carries its own generatedAt timestamp; callers should surface
 * staleness rather than treat prices as live.
 */
import { BaseConnector } from './base.js';
const SUNRISE_REST_BASE = 'https://sun.clawdcompute.us';
export class SunriseConnector extends BaseConnector {
    restBase = SUNRISE_REST_BASE;
    cache = null;
    constructor(config = {}) {
        super({ name: 'sunrise', apiKey: '', ...config });
    }
    /** Full snapshot (cached per instance; call refresh() to re-read). */
    async snapshot(refresh = false) {
        if (this.cache && !refresh) {
            return {
                ...this.cache,
                stalenessSeconds: Math.max(0, Math.round((Date.now() - Date.parse(this.cache.generatedAt)) / 1000)),
            };
        }
        const raw = await this.restGet('/api/sunrise');
        this.cache = {
            ok: raw.ok,
            generatedAt: raw.generatedAt,
            universe: raw.universe,
            assets: raw.assets ?? [],
            stalenessSeconds: Math.max(0, Math.round((Date.now() - Date.parse(raw.generatedAt)) / 1000)),
        };
        return this.cache;
    }
    /** All Sunrise assets in the current snapshot. */
    async listAssets() {
        return (await this.snapshot()).assets;
    }
    /** One asset by symbol, e.g. AAPL. Case-insensitive. */
    async asset(symbol) {
        const wanted = symbol.toUpperCase();
        return (await this.snapshot()).assets.find((a) => a.symbol.toUpperCase() === wanted);
    }
    async status() {
        const base = {
            provider: this.id,
            configured: true, // keyless snapshot
            restBase: this.config.restBase ?? this.restBase,
        };
        try {
            const snap = await this.snapshot();
            base.note = `snapshot ${snap.generatedAt} — ${snap.assets.length} assets, ${snap.stalenessSeconds}s old`;
        }
        catch (err) {
            base.error = err.message;
        }
        return base;
    }
}
//# sourceMappingURL=sunrise.js.map