/**
 * Clawd Connectors — Imperial
 * Imperial perpetuals router (https://api.imperial.space, paths under /api/v1).
 *
 * - Public market/venue/stats reads need no auth.
 * - Wallet-scoped public reads take a walletAddress.
 * - JWT reads (balances, points, partner registration) need IMPERIAL_JWT —
 *   a trading credential: never log it, never commit it.
 * - Order placement/cancel/update and deposit-tx building are FAIL-CLOSED:
 *   they refuse unless allowTrading is explicitly enabled
 *   (IMPERIAL_ALLOW_TRADING=1) AND a JWT is configured. Per the fleet rules,
 *   every live order still needs the user's per-trade approval in the
 *   calling application — this connector only provides the transport.
 *
 * Imperial convention: POST /mobile/orders* returns HTTP 200 even on
 * rejection — always inspect `success` / `error` / `errorCode` in the body.
 * Profiles are isolated subaccounts, index 0–5; profileIndex is required on
 * every order/deposit/balance call.
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig, ProviderStatus } from '../types.js';

const IMPERIAL_REST_BASE = 'https://api.imperial.space';

export interface ImperialOrder {
  wallet: string;
  profileIndex: number; // 0–5
  underwriter: number; // 0 Jupiter, 2 Phoenix, 3 GMTrade, 5 Pairs, 6 Touch, 7 Armada
  side: 0 | 1; // 0 long, 1 short
  action: 0 | 1; // 0 Increase, 1 Decrease
  orderType: number;
  fundingStatus: number; // 0 = funded at creation
  priority: number;
  collateralAmount: number; // µUSD
  sizeUsd: number; // µUSD (6-decimal); full close may use closeBps instead
  slippageBps: number;
  triggerPrice: number; // oracle scale 1e9
  triggerCondition: 0 | 1; // 0 Above, 1 Below
  symbol?: string;
  marketMint?: string;
  marketPrice?: number; // per-underwriter scale — see skill docs
  builderCode?: string;
  closeBps?: number; // decrease only; 10000 = full close of the LIVE position
  [key: string]: unknown;
}

export class ImperialConnector extends BaseConnector {
  protected restBase = IMPERIAL_REST_BASE;

  constructor(config: Partial<ProviderConfig> = {}) {
    super({ name: 'imperial', apiKey: '', ...config });
  }

  private pub<T>(path: string): Promise<T> {
    return this.restGet<T>(`/api/v1${path}`);
  }

  private jwtGet<T>(path: string): Promise<T> {
    return this.restGet<T>(`/api/v1${path}`, this.bearerHeaders());
  }

  private jwtPost<T>(path: string, body: unknown): Promise<T> {
    return this.restPost<T>(`/api/v1${path}`, body, this.bearerHeaders());
  }

  // ── Public reads (no auth) ──────────────────────────────────────────────

  async health<T = unknown>(): Promise<T> {
    return this.pub<T>('/status');
  }

  async markPrices<T = unknown>(): Promise<T> {
    return this.pub<T>('/mark-prices');
  }

  async fundingRates<T = unknown>(): Promise<T> {
    return this.pub<T>('/funding-rates');
  }

  async route<T = unknown>(params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams(params).toString();
    return this.pub<T>(`/route${qs ? `?${qs}` : ''}`);
  }

  async phoenixMarkets<T = unknown>(): Promise<T> {
    return this.pub<T>('/phoenix/markets');
  }

  async phoenixDepth<T = unknown>(symbol?: string): Promise<T> {
    return this.pub<T>(`/phoenix/depth${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''}`);
  }

  async statsSummary<T = unknown>(): Promise<T> {
    return this.pub<T>('/stats/summary');
  }

  async statsMarkets<T = unknown>(period: '24h' | '7d' | '30d' = '24h'): Promise<T> {
    return this.pub<T>(`/stats/markets?period=${period}`);
  }

  async statsVolume<T = unknown>(): Promise<T> {
    return this.pub<T>('/stats/volume');
  }

  async statsOpenInterest<T = unknown>(): Promise<T> {
    return this.pub<T>('/stats/open-interest');
  }

  async positions<T = unknown>(walletAddress: string, underwriter?: number): Promise<T> {
    const qs = new URLSearchParams({ walletAddress });
    if (underwriter !== undefined) qs.set('underwriter', String(underwriter));
    return this.pub<T>(`/positions?${qs.toString()}`);
  }

  async orders<T = unknown>(walletAddress: string): Promise<T> {
    return this.pub<T>(`/orders?walletAddress=${encodeURIComponent(walletAddress)}`);
  }

  async trades<T = unknown>(walletAddress: string): Promise<T> {
    return this.pub<T>(`/trades?walletAddress=${encodeURIComponent(walletAddress)}`);
  }

  async pnlHistory<T = unknown>(
    walletAddress: string,
    resolution: '1h' | '1d' = '1d',
  ): Promise<T> {
    const qs = new URLSearchParams({ walletAddress, resolution });
    return this.pub<T>(`/pnl-history?${qs.toString()}`);
  }

  async touchMarkets<T = unknown>(): Promise<T> {
    return this.pub<T>('/touch/markets');
  }

  async touchDeals<T = unknown>(): Promise<T> {
    return this.pub<T>('/touch/deals');
  }

  async touchPositions<T = unknown>(walletAddress: string): Promise<T> {
    return this.pub<T>(`/touch/positions?walletAddress=${encodeURIComponent(walletAddress)}`);
  }

  async armadaMarkets<T = unknown>(): Promise<T> {
    return this.pub<T>('/armada/markets');
  }

  async armadaStatus<T = unknown>(): Promise<T> {
    return this.pub<T>('/armada/status');
  }

  // ── JWT reads ───────────────────────────────────────────────────────────

  /** Per-profile USDC balances (µUSD). Requires IMPERIAL_JWT. */
  async balances<T = unknown>(): Promise<T> {
    return this.jwtGet<T>('/mobile/balances');
  }

  /** Wallet's Imperial points for the active season. Requires IMPERIAL_JWT. */
  async points<T = unknown>(): Promise<T> {
    return this.jwtGet<T>('/mobile/points');
  }

  /** Partner registration status. Requires IMPERIAL_JWT. */
  async partnerRegistration<T = unknown>(): Promise<T> {
    return this.jwtGet<T>('/mobile/partner/registration');
  }

  // ── Trading (fail-closed: allowTrading + JWT required) ─────────────────

  /**
   * Preflight: asks whether an order would be accepted WITHOUT placing it.
   * Non-mutating, but JWT-gated upstream; not behind allowTrading.
   */
  async preflight<T = unknown>(order: ImperialOrder): Promise<T> {
    return this.jwtPost<T>('/mobile/orders/preflight', order);
  }

  /** Place an order. Inspect `success` in the result — HTTP 200 ≠ accepted. */
  async placeOrder<T = unknown>(order: ImperialOrder): Promise<T> {
    this.requireTrading('placeOrder');
    return this.jwtPost<T>('/mobile/orders', order);
  }

  /** Cancel an order by PDA. */
  async cancelOrder<T = unknown>(params: {
    wallet: string;
    profileIndex: number;
    orderPda: string;
    cascadeChildren?: boolean;
  }): Promise<T> {
    this.requireTrading('cancelOrder');
    return this.jwtPost<T>('/mobile/orders/cancel', params);
  }

  /**
   * Build a deposit/withdraw tx (sponsored, partially signed — the user's
   * wallet signs before submit). Building moves no funds, but it is part of
   * the trading surface, so it sits behind the same opt-in.
   */
  async buildDepositTx<T = unknown>(params: {
    wallet: string;
    profileIndex: number;
    mode: 'deposit' | 'withdraw';
    amount: number; // USDC native units (6-decimal)
    deferOperatorSignature?: boolean;
  }): Promise<T> {
    this.requireTrading('buildDepositTx');
    return this.jwtPost<T>('/deposit/build-tx', params);
  }

  async status(): Promise<ProviderStatus> {
    const base: ProviderStatus = {
      provider: this.id,
      configured: true, // public reads are keyless
      restBase: this.config.restBase ?? this.restBase,
      note:
        `jwt=${this.config.jwt ? 'set' : 'missing'} ` +
        `allowTrading=${this.config.allowTrading ? 'on' : 'off (fail-closed)'}`,
    };
    try {
      await this.health();
    } catch (err) {
      base.error = (err as Error).message;
    }
    return base;
  }
}
