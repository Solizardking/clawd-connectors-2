/**
 * Clawd Connectors — Backpack Exchange
 * READ-ONLY public market data from https://api.backpack.exchange
 * (Backpack is an exchange — never call it a DEX.)
 *
 * Authenticated trading is NOT enabled in this package: no ED25519 seed is
 * ever generated, stored, or accepted here. The canonical signing-string
 * builder below is included as a reference for integrators who later wire
 * their own user-approved custody; it performs no authenticated calls.
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig, ProviderStatus } from '../types.js';
export declare class BackpackConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
    /** Exchange status (public). */
    exchangeStatus<T = unknown>(): Promise<T>;
    /** All markets; filter client-side by quoteAsset when given. */
    markets<T = unknown[]>(quoteAsset?: string): Promise<T>;
    /** 24h ticker for one symbol, e.g. SOL_USDC. */
    ticker<T = unknown>(symbol: string): Promise<T>;
    /** All tickers. */
    tickers<T = unknown>(): Promise<T>;
    /** Order book depth for a symbol. */
    depth<T = unknown>(symbol: string, limit?: number): Promise<T>;
    /** Recent trades for a symbol. */
    trades<T = unknown>(symbol: string, limit?: number): Promise<T>;
    /**
     * Candles. startTime/endTime are SECONDS (not ms).
     * Intervals: 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M.
     */
    klines<T = unknown>(params: {
        symbol: string;
        interval: string;
        startTime: number;
        endTime: number;
    }): Promise<T>;
    status(): Promise<ProviderStatus>;
}
/**
 * Build Backpack's canonical ED25519 signing string (reference only):
 *   instruction=<instruction>&<alphabetically-sorted params>&timestamp=<ms>&window=<ms>
 * Only parameters actually sent are included. For orderId/clientId endpoints
 * send exactly one of the two — sending both fails signature verification.
 */
export declare function backpackSigningString(instruction: string, params: Record<string, string | number>, timestampMs: number, windowMs?: number): string;
//# sourceMappingURL=backpack.d.ts.map