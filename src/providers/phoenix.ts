/**
 * Clawd Connectors — Phoenix
 * READ-ONLY Phoenix perpetuals market data from the Phoenix Eternal public
 * API (https://perp-api.phoenix.trade). Live trading on Phoenix runs through
 * the user's own Vulcan wallet flow and is intentionally NOT in this package.
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig, ProviderStatus } from '../types.js';

const PHOENIX_REST_BASE = 'https://perp-api.phoenix.trade';

export class PhoenixConnector extends BaseConnector {
  protected restBase = PHOENIX_REST_BASE;

  constructor(config: Partial<ProviderConfig> = {}) {
    super({ name: 'phoenix', apiKey: '', ...config });
  }

  /** Full exchange configuration. */
  async exchange<T = unknown>(): Promise<T> {
    return this.restGet<T>('/v1/view/exchange');
  }

  /** Exchange pubkeys. */
  async exchangeKeys<T = unknown>(): Promise<T> {
    return this.restGet<T>('/v1/view/exchange/keys');
  }

  /** Exchange status. */
  async exchangeStatus<T = unknown>(): Promise<T> {
    return this.restGet<T>('/v1/view/exchange/status');
  }

  /** Exchange state snapshot (version, slot, status bits). */
  async snapshot<T = unknown>(): Promise<T> {
    return this.restGet<T>('/v1/exchange/snapshot');
  }

  /** All markets. */
  async markets<T = unknown>(): Promise<T> {
    return this.restGet<T>('/v1/view/exchange/markets');
  }

  /** One market by symbol, e.g. SOL-PERP. */
  async market<T = unknown>(symbol: string): Promise<T> {
    return this.restGet<T>(`/v1/view/exchange/market/${encodeURIComponent(symbol)}`);
  }

  /** Order book for a market symbol. */
  async orderbook<T = unknown>(symbol: string): Promise<T> {
    return this.restGet<T>(`/v1/view/orderbook/${encodeURIComponent(symbol)}`);
  }

  /** Mark price for a market symbol. */
  async markPrice<T = unknown>(symbol: string): Promise<T> {
    return this.restGet<T>(`/v1/market/${encodeURIComponent(symbol)}/mark-price`);
  }

  /** Market stats history for a symbol. */
  async marketStats<T = unknown>(symbol: string): Promise<T> {
    return this.restGet<T>(`/v1/market/${encodeURIComponent(symbol)}/stats`);
  }

  async status(): Promise<ProviderStatus> {
    const base: ProviderStatus = {
      provider: this.id,
      configured: true, // keyless public market data
      restBase: this.config.restBase ?? this.restBase,
      note: 'read-only market data; live trading stays in the user-approved Vulcan wallet flow',
    };
    try {
      await this.exchangeStatus();
    } catch (err) {
      base.error = (err as Error).message;
    }
    return base;
  }
}
