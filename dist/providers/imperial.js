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
const IMPERIAL_REST_BASE = 'https://api.imperial.space';
export class ImperialConnector extends BaseConnector {
    restBase = IMPERIAL_REST_BASE;
    constructor(config = {}) {
        super({ name: 'imperial', apiKey: '', ...config });
    }
    pub(path) {
        return this.restGet(`/api/v1${path}`);
    }
    jwtGet(path) {
        return this.restGet(`/api/v1${path}`, this.bearerHeaders());
    }
    jwtPost(path, body) {
        return this.restPost(`/api/v1${path}`, body, this.bearerHeaders());
    }
    // ── Public reads (no auth) ──────────────────────────────────────────────
    async health() {
        return this.pub('/status');
    }
    async markPrices() {
        return this.pub('/mark-prices');
    }
    async fundingRates() {
        return this.pub('/funding-rates');
    }
    async route(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.pub(`/route${qs ? `?${qs}` : ''}`);
    }
    async phoenixMarkets() {
        return this.pub('/phoenix/markets');
    }
    async phoenixDepth(symbol) {
        return this.pub(`/phoenix/depth${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''}`);
    }
    async statsSummary() {
        return this.pub('/stats/summary');
    }
    async statsMarkets(period = '24h') {
        return this.pub(`/stats/markets?period=${period}`);
    }
    async statsVolume() {
        return this.pub('/stats/volume');
    }
    async statsOpenInterest() {
        return this.pub('/stats/open-interest');
    }
    async positions(walletAddress, underwriter) {
        const qs = new URLSearchParams({ walletAddress });
        if (underwriter !== undefined)
            qs.set('underwriter', String(underwriter));
        return this.pub(`/positions?${qs.toString()}`);
    }
    async orders(walletAddress) {
        return this.pub(`/orders?walletAddress=${encodeURIComponent(walletAddress)}`);
    }
    async trades(walletAddress) {
        return this.pub(`/trades?walletAddress=${encodeURIComponent(walletAddress)}`);
    }
    async pnlHistory(walletAddress, resolution = '1d') {
        const qs = new URLSearchParams({ walletAddress, resolution });
        return this.pub(`/pnl-history?${qs.toString()}`);
    }
    async touchMarkets() {
        return this.pub('/touch/markets');
    }
    async touchDeals() {
        return this.pub('/touch/deals');
    }
    async touchPositions(walletAddress) {
        return this.pub(`/touch/positions?walletAddress=${encodeURIComponent(walletAddress)}`);
    }
    async armadaMarkets() {
        return this.pub('/armada/markets');
    }
    async armadaStatus() {
        return this.pub('/armada/status');
    }
    // ── JWT reads ───────────────────────────────────────────────────────────
    /** Per-profile USDC balances (µUSD). Requires IMPERIAL_JWT. */
    async balances() {
        return this.jwtGet('/mobile/balances');
    }
    /** Wallet's Imperial points for the active season. Requires IMPERIAL_JWT. */
    async points() {
        return this.jwtGet('/mobile/points');
    }
    /** Partner registration status. Requires IMPERIAL_JWT. */
    async partnerRegistration() {
        return this.jwtGet('/mobile/partner/registration');
    }
    // ── Trading (fail-closed: allowTrading + JWT required) ─────────────────
    /**
     * Preflight: asks whether an order would be accepted WITHOUT placing it.
     * Non-mutating, but JWT-gated upstream; not behind allowTrading.
     */
    async preflight(order) {
        return this.jwtPost('/mobile/orders/preflight', order);
    }
    /** Place an order. Inspect `success` in the result — HTTP 200 ≠ accepted. */
    async placeOrder(order) {
        this.requireTrading('placeOrder');
        return this.jwtPost('/mobile/orders', order);
    }
    /** Cancel an order by PDA. */
    async cancelOrder(params) {
        this.requireTrading('cancelOrder');
        return this.jwtPost('/mobile/orders/cancel', params);
    }
    /**
     * Build a deposit/withdraw tx (sponsored, partially signed — the user's
     * wallet signs before submit). Building moves no funds, but it is part of
     * the trading surface, so it sits behind the same opt-in.
     */
    async buildDepositTx(params) {
        this.requireTrading('buildDepositTx');
        return this.jwtPost('/deposit/build-tx', params);
    }
    async status() {
        const base = {
            provider: this.id,
            configured: true, // public reads are keyless
            restBase: this.config.restBase ?? this.restBase,
            note: `jwt=${this.config.jwt ? 'set' : 'missing'} ` +
                `allowTrading=${this.config.allowTrading ? 'on' : 'off (fail-closed)'}`,
        };
        try {
            await this.health();
        }
        catch (err) {
            base.error = err.message;
        }
        return base;
    }
}
//# sourceMappingURL=imperial.js.map