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
export interface ImperialOrder {
    wallet: string;
    profileIndex: number;
    underwriter: number;
    side: 0 | 1;
    action: 0 | 1;
    orderType: number;
    fundingStatus: number;
    priority: number;
    collateralAmount: number;
    sizeUsd: number;
    slippageBps: number;
    triggerPrice: number;
    triggerCondition: 0 | 1;
    symbol?: string;
    marketMint?: string;
    marketPrice?: number;
    builderCode?: string;
    closeBps?: number;
    [key: string]: unknown;
}
export declare class ImperialConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
    private pub;
    private jwtGet;
    private jwtPost;
    health<T = unknown>(): Promise<T>;
    markPrices<T = unknown>(): Promise<T>;
    fundingRates<T = unknown>(): Promise<T>;
    route<T = unknown>(params?: Record<string, string>): Promise<T>;
    phoenixMarkets<T = unknown>(): Promise<T>;
    phoenixDepth<T = unknown>(symbol?: string): Promise<T>;
    statsSummary<T = unknown>(): Promise<T>;
    statsMarkets<T = unknown>(period?: '24h' | '7d' | '30d'): Promise<T>;
    statsVolume<T = unknown>(): Promise<T>;
    statsOpenInterest<T = unknown>(): Promise<T>;
    positions<T = unknown>(walletAddress: string, underwriter?: number): Promise<T>;
    orders<T = unknown>(walletAddress: string): Promise<T>;
    trades<T = unknown>(walletAddress: string): Promise<T>;
    pnlHistory<T = unknown>(walletAddress: string, resolution?: '1h' | '1d'): Promise<T>;
    touchMarkets<T = unknown>(): Promise<T>;
    touchDeals<T = unknown>(): Promise<T>;
    touchPositions<T = unknown>(walletAddress: string): Promise<T>;
    armadaMarkets<T = unknown>(): Promise<T>;
    armadaStatus<T = unknown>(): Promise<T>;
    /** Per-profile USDC balances (µUSD). Requires IMPERIAL_JWT. */
    balances<T = unknown>(): Promise<T>;
    /** Wallet's Imperial points for the active season. Requires IMPERIAL_JWT. */
    points<T = unknown>(): Promise<T>;
    /** Partner registration status. Requires IMPERIAL_JWT. */
    partnerRegistration<T = unknown>(): Promise<T>;
    /**
     * Preflight: asks whether an order would be accepted WITHOUT placing it.
     * Non-mutating, but JWT-gated upstream; not behind allowTrading.
     */
    preflight<T = unknown>(order: ImperialOrder): Promise<T>;
    /** Place an order. Inspect `success` in the result — HTTP 200 ≠ accepted. */
    placeOrder<T = unknown>(order: ImperialOrder): Promise<T>;
    /** Cancel an order by PDA. */
    cancelOrder<T = unknown>(params: {
        wallet: string;
        profileIndex: number;
        orderPda: string;
        cascadeChildren?: boolean;
    }): Promise<T>;
    /**
     * Build a deposit/withdraw tx (sponsored, partially signed — the user's
     * wallet signs before submit). Building moves no funds, but it is part of
     * the trading surface, so it sits behind the same opt-in.
     */
    buildDepositTx<T = unknown>(params: {
        wallet: string;
        profileIndex: number;
        mode: 'deposit' | 'withdraw';
        amount: number;
        deferOperatorSignature?: boolean;
    }): Promise<T>;
    status(): Promise<ProviderStatus>;
}
//# sourceMappingURL=imperial.d.ts.map