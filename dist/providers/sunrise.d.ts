/**
 * Clawd Connectors — Sunrise
 * Read-only client for the Sunrise (Backpack Securities tokenized equities)
 * snapshot served by the Sun board at https://sun.clawdcompute.us/api/sunrise
 * — the same snapshot the equities MCP's equities_sunrise_* tools read.
 * The snapshot carries its own generatedAt timestamp; callers should surface
 * staleness rather than treat prices as live.
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig, ProviderStatus } from '../types.js';
export interface SunriseAsset {
    symbol: string;
    name?: string;
    issuer?: string;
    mint?: string;
    backpackSymbol?: string;
    price?: number;
    priceSource?: string;
    [key: string]: unknown;
}
export interface SunriseSnapshot {
    ok: boolean;
    generatedAt: string;
    universe?: string;
    assets: SunriseAsset[];
    /** Age of the snapshot in seconds at read time. */
    stalenessSeconds: number;
}
export declare class SunriseConnector extends BaseConnector {
    protected restBase: string;
    private cache;
    constructor(config?: Partial<ProviderConfig>);
    /** Full snapshot (cached per instance; call refresh() to re-read). */
    snapshot(refresh?: boolean): Promise<SunriseSnapshot>;
    /** All Sunrise assets in the current snapshot. */
    listAssets(): Promise<SunriseAsset[]>;
    /** One asset by symbol, e.g. AAPL. Case-insensitive. */
    asset(symbol: string): Promise<SunriseAsset | undefined>;
    status(): Promise<ProviderStatus>;
}
//# sourceMappingURL=sunrise.d.ts.map