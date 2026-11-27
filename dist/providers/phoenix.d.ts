/**
 * Clawd Connectors — Phoenix
 * READ-ONLY Phoenix perpetuals market data from the Phoenix Eternal public
 * API (https://perp-api.phoenix.trade). Live trading on Phoenix runs through
 * the user's own Vulcan wallet flow and is intentionally NOT in this package.
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig, ProviderStatus } from '../types.js';
export declare class PhoenixConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
    /** Full exchange configuration. */
    exchange<T = unknown>(): Promise<T>;
    /** Exchange pubkeys. */
    exchangeKeys<T = unknown>(): Promise<T>;
    /** Exchange status. */
    exchangeStatus<T = unknown>(): Promise<T>;
    /** Exchange state snapshot (version, slot, status bits). */
    snapshot<T = unknown>(): Promise<T>;
    /** All markets. */
    markets<T = unknown>(): Promise<T>;
    /** One market by symbol, e.g. SOL-PERP. */
    market<T = unknown>(symbol: string): Promise<T>;
    /** Order book for a market symbol. */
    orderbook<T = unknown>(symbol: string): Promise<T>;
    /** Mark price for a market symbol. */
    markPrice<T = unknown>(symbol: string): Promise<T>;
    /** Market stats history for a symbol. */
    marketStats<T = unknown>(symbol: string): Promise<T>;
    status(): Promise<ProviderStatus>;
}
//# sourceMappingURL=phoenix.d.ts.map