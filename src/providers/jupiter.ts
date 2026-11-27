/**
 * Clawd Connectors — Jupiter
 * MCP connector (https://api.jup.ag/mcp) with REST on https://api.jup.ag.
 * All REST calls carry the x-api-key header (JUPITER_API_KEY). Amounts are
 * atomic units. Jupiter Perps has NO REST API (on-chain only) — not covered.
 * Jupiter Lend is SDK-based (@jup-ag/lend-read / @jup-ag/lend) and is
 * reachable through the Jupiter MCP server rather than REST here.
 *
 * Swap flow (Swap API V2): swapOrder() returns an UNSIGNED transaction for
 * the taker's own wallet to sign; swapExecute() submits a signed swap and
 * is fail-closed behind allowTrading (JUPITER_ALLOW_TRADING=1). Trigger and
 * Recurring writes follow the same build-unsigned pattern — this package
 * exposes their read + build paths and never executes them itself.
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig } from '../types.js';

const JUPITER_REST_BASE = 'https://api.jup.ag';

export interface JupiterSwapOrder {
  transaction: string; // base64, unsigned — taker signs
  requestId: string;
  inAmount?: string;
  outAmount?: string;
  priceImpactPct?: number;
  routePlan?: unknown[];
  [key: string]: unknown;
}

export class JupiterConnector extends BaseConnector {
  protected restBase = JUPITER_REST_BASE;

  constructor(config: Partial<ProviderConfig> = {}) {
    super({ name: 'jupiter', apiKey: '', ...config });
  }

  // ── Swap API V2 ─────────────────────────────────────────────────────────

  /**
   * Get a swap order: quote + UNSIGNED transaction for `taker` to sign.
   * Include the gasless check for wallets with <0.01 SOL in your UI flow.
   */
  async swapOrder(params: {
    inputMint: string;
    outputMint: string;
    amount: number | string;
    taker: string;
    slippageBps?: number;
  }): Promise<JupiterSwapOrder> {
    const qs = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: String(params.amount),
      taker: params.taker,
    });
    if (params.slippageBps !== undefined) qs.set('slippageBps', String(params.slippageBps));
    return this.restGet<JupiterSwapOrder>(`/swap/v2/order?${qs.toString()}`);
  }

  /**
   * Execute a signed swap. Fail-closed behind allowTrading. Always pass the
   * requestId from swapOrder for idempotent retries (2-minute window).
   */
  async swapExecute(params: {
    signedTransaction: string;
    requestId: string;
  }): Promise<Record<string, unknown>> {
    this.requireTrading('swapExecute');
    return this.restPost<Record<string, unknown>>('/swap/v2/execute', {
      signedTransaction: params.signedTransaction,
      requestId: params.requestId,
    });
  }

  /**
   * Back-compat quote convenience — now served by Swap API V2 /order
   * (the v6 quote API on quote-api.jup.ag is retired). Requires a taker.
   */
  async quote(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps?: number;
    taker?: string;
  }): Promise<{ outAmount: string; routePlan: unknown[] }> {
    if (!params.taker) {
      throw new Error(
        'jupiter quote: Swap API V2 requires a taker wallet — pass { taker } or use swapOrder()',
      );
    }
    const order = await this.swapOrder({ ...params, taker: params.taker });
    return {
      outAmount: order.outAmount ?? '',
      routePlan: (order.routePlan ?? []) as unknown[],
    };
  }

  /** Token safety check (Token Shield) before displaying tokens in UIs. */
  async shield<T = unknown>(mints: string[]): Promise<T> {
    return this.restGet<T>(`/swap/v2/shield?mints=${mints.map(encodeURIComponent).join(',')}`);
  }

  // ── Token & price data ──────────────────────────────────────────────────

  /** Search tokens by name, symbol, or mint. */
  async searchTokens<T = unknown>(query: string): Promise<T> {
    return this.restGet<T>(`/tokens/v2/search?query=${encodeURIComponent(query)}`);
  }

  /** Prices for mints (Price API v3). */
  async prices<T = unknown>(ids: string[]): Promise<T> {
    return this.restGet<T>(`/price/v3?ids=${ids.map(encodeURIComponent).join(',')}`);
  }

  // ── Trigger (limit orders) — reads + unsigned builds ────────────────────

  /** List a wallet's trigger orders. */
  async triggerOrders<T = unknown>(owner: string): Promise<T> {
    return this.restGet<T>(`/trigger/v2/list?owner=${encodeURIComponent(owner)}`);
  }

  /** Build an UNSIGNED create-order transaction (user signs + submits). */
  async triggerCreateOrder<T = unknown>(body: Record<string, unknown>): Promise<T> {
    return this.restPost<T>('/trigger/v2/createOrder', body);
  }

  /** Build an UNSIGNED cancel-order transaction (user signs + submits). */
  async triggerCancelOrder<T = unknown>(body: Record<string, unknown>): Promise<T> {
    return this.restPost<T>('/trigger/v2/cancelOrder', body);
  }

  // ── Recurring (DCA) — reads ─────────────────────────────────────────────

  /** List a wallet's recurring (DCA) orders. */
  async recurringOrders<T = unknown>(owner: string): Promise<T> {
    return this.restGet<T>(`/recurring/v1/list?owner=${encodeURIComponent(owner)}`);
  }
}
