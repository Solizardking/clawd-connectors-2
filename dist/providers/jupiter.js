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
const JUPITER_REST_BASE = 'https://api.jup.ag';
export class JupiterConnector extends BaseConnector {
    restBase = JUPITER_REST_BASE;
    constructor(config = {}) {
        super({ name: 'jupiter', apiKey: '', ...config });
    }
    // ── Swap API V2 ─────────────────────────────────────────────────────────
    /**
     * Get a swap order: quote + UNSIGNED transaction for `taker` to sign.
     * Include the gasless check for wallets with <0.01 SOL in your UI flow.
     */
    async swapOrder(params) {
        const qs = new URLSearchParams({
            inputMint: params.inputMint,
            outputMint: params.outputMint,
            amount: String(params.amount),
            taker: params.taker,
        });
        if (params.slippageBps !== undefined)
            qs.set('slippageBps', String(params.slippageBps));
        return this.restGet(`/swap/v2/order?${qs.toString()}`);
    }
    /**
     * Execute a signed swap. Fail-closed behind allowTrading. Always pass the
     * requestId from swapOrder for idempotent retries (2-minute window).
     */
    async swapExecute(params) {
        this.requireTrading('swapExecute');
        return this.restPost('/swap/v2/execute', {
            signedTransaction: params.signedTransaction,
            requestId: params.requestId,
        });
    }
    /**
     * Back-compat quote convenience — now served by Swap API V2 /order
     * (the v6 quote API on quote-api.jup.ag is retired). Requires a taker.
     */
    async quote(params) {
        if (!params.taker) {
            throw new Error('jupiter quote: Swap API V2 requires a taker wallet — pass { taker } or use swapOrder()');
        }
        const order = await this.swapOrder({ ...params, taker: params.taker });
        return {
            outAmount: order.outAmount ?? '',
            routePlan: (order.routePlan ?? []),
        };
    }
    /** Token safety check (Token Shield) before displaying tokens in UIs. */
    async shield(mints) {
        return this.restGet(`/swap/v2/shield?mints=${mints.map(encodeURIComponent).join(',')}`);
    }
    // ── Token & price data ──────────────────────────────────────────────────
    /** Search tokens by name, symbol, or mint. */
    async searchTokens(query) {
        return this.restGet(`/tokens/v2/search?query=${encodeURIComponent(query)}`);
    }
    /** Prices for mints (Price API v3). */
    async prices(ids) {
        return this.restGet(`/price/v3?ids=${ids.map(encodeURIComponent).join(',')}`);
    }
    // ── Trigger (limit orders) — reads + unsigned builds ────────────────────
    /** List a wallet's trigger orders. */
    async triggerOrders(owner) {
        return this.restGet(`/trigger/v2/list?owner=${encodeURIComponent(owner)}`);
    }
    /** Build an UNSIGNED create-order transaction (user signs + submits). */
    async triggerCreateOrder(body) {
        return this.restPost('/trigger/v2/createOrder', body);
    }
    /** Build an UNSIGNED cancel-order transaction (user signs + submits). */
    async triggerCancelOrder(body) {
        return this.restPost('/trigger/v2/cancelOrder', body);
    }
    // ── Recurring (DCA) — reads ─────────────────────────────────────────────
    /** List a wallet's recurring (DCA) orders. */
    async recurringOrders(owner) {
        return this.restGet(`/recurring/v1/list?owner=${encodeURIComponent(owner)}`);
    }
}
//# sourceMappingURL=jupiter.js.map