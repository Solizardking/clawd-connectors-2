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
export interface JupiterSwapOrder {
    transaction: string;
    requestId: string;
    inAmount?: string;
    outAmount?: string;
    priceImpactPct?: number;
    routePlan?: unknown[];
    [key: string]: unknown;
}
export declare class JupiterConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
    /**
     * Get a swap order: quote + UNSIGNED transaction for `taker` to sign.
     * Include the gasless check for wallets with <0.01 SOL in your UI flow.
     */
    swapOrder(params: {
        inputMint: string;
        outputMint: string;
        amount: number | string;
        taker: string;
        slippageBps?: number;
    }): Promise<JupiterSwapOrder>;
    /**
     * Execute a signed swap. Fail-closed behind allowTrading. Always pass the
     * requestId from swapOrder for idempotent retries (2-minute window).
     */
    swapExecute(params: {
        signedTransaction: string;
        requestId: string;
    }): Promise<Record<string, unknown>>;
    /**
     * Back-compat quote convenience — now served by Swap API V2 /order
     * (the v6 quote API on quote-api.jup.ag is retired). Requires a taker.
     */
    quote(params: {
        inputMint: string;
        outputMint: string;
        amount: number;
        slippageBps?: number;
        taker?: string;
    }): Promise<{
        outAmount: string;
        routePlan: unknown[];
    }>;
    /** Token safety check (Token Shield) before displaying tokens in UIs. */
    shield<T = unknown>(mints: string[]): Promise<T>;
    /** Search tokens by name, symbol, or mint. */
    searchTokens<T = unknown>(query: string): Promise<T>;
    /** Prices for mints (Price API v3). */
    prices<T = unknown>(ids: string[]): Promise<T>;
    /** List a wallet's trigger orders. */
    triggerOrders<T = unknown>(owner: string): Promise<T>;
    /** Build an UNSIGNED create-order transaction (user signs + submits). */
    triggerCreateOrder<T = unknown>(body: Record<string, unknown>): Promise<T>;
    /** Build an UNSIGNED cancel-order transaction (user signs + submits). */
    triggerCancelOrder<T = unknown>(body: Record<string, unknown>): Promise<T>;
    /** List a wallet's recurring (DCA) orders. */
    recurringOrders<T = unknown>(owner: string): Promise<T>;
}
//# sourceMappingURL=jupiter.d.ts.map