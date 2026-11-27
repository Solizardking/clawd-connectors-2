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

const BACKPACK_REST_BASE = 'https://api.backpack.exchange';

export class BackpackConnector extends BaseConnector {
  protected restBase = BACKPACK_REST_BASE;

  constructor(config: Partial<ProviderConfig> = {}) {
    super({ name: 'backpack', apiKey: '', ...config });
  }

  /** Exchange status (public). */
  async exchangeStatus<T = unknown>(): Promise<T> {
    return this.restGet<T>('/api/v1/status');
  }

  /** All markets; filter client-side by quoteAsset when given. */
  async markets<T = unknown[]>(quoteAsset?: string): Promise<T> {
    const all = await this.restGet<unknown[]>('/api/v1/markets');
    if (!quoteAsset) return all as T;
    return (all as Array<Record<string, unknown>>).filter(
      (m) => m.quoteSymbol === quoteAsset || m.quoteAsset === quoteAsset,
    ) as T;
  }

  /** 24h ticker for one symbol, e.g. SOL_USDC. */
  async ticker<T = unknown>(symbol: string): Promise<T> {
    return this.restGet<T>(`/api/v1/ticker?symbol=${encodeURIComponent(symbol)}`);
  }

  /** All tickers. */
  async tickers<T = unknown>(): Promise<T> {
    return this.restGet<T>('/api/v1/tickers');
  }

  /** Order book depth for a symbol. */
  async depth<T = unknown>(symbol: string, limit?: number): Promise<T> {
    const qs = new URLSearchParams({ symbol });
    if (limit) qs.set('limit', String(limit));
    return this.restGet<T>(`/api/v1/depth?${qs.toString()}`);
  }

  /** Recent trades for a symbol. */
  async trades<T = unknown>(symbol: string, limit = 25): Promise<T> {
    const qs = new URLSearchParams({ symbol, limit: String(limit) });
    return this.restGet<T>(`/api/v1/trades?${qs.toString()}`);
  }

  /**
   * Candles. startTime/endTime are SECONDS (not ms).
   * Intervals: 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M.
   */
  async klines<T = unknown>(params: {
    symbol: string;
    interval: string;
    startTime: number;
    endTime: number;
  }): Promise<T> {
    const qs = new URLSearchParams({
      symbol: params.symbol,
      interval: params.interval,
      startTime: String(params.startTime),
      endTime: String(params.endTime),
    });
    return this.restGet<T>(`/api/v1/klines?${qs.toString()}`);
  }

  async status(): Promise<ProviderStatus> {
    const base: ProviderStatus = {
      provider: this.id,
      configured: true, // keyless public market data
      restBase: this.config.restBase ?? this.restBase,
      note: 'read-only public market data; authenticated trading NOT enabled',
    };
    try {
      await this.exchangeStatus();
    } catch (err) {
      base.error = (err as Error).message;
    }
    return base;
  }
}

/**
 * Build Backpack's canonical ED25519 signing string (reference only):
 *   instruction=<instruction>&<alphabetically-sorted params>&timestamp=<ms>&window=<ms>
 * Only parameters actually sent are included. For orderId/clientId endpoints
 * send exactly one of the two — sending both fails signature verification.
 */
export function backpackSigningString(
  instruction: string,
  params: Record<string, string | number>,
  timestampMs: number,
  windowMs = 5000,
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return (
    `instruction=${instruction}` +
    (sorted ? `&${sorted}` : '') +
    `&timestamp=${timestampMs}&window=${windowMs}`
  );
}
