/**
 * Clawd Connectors — Raydium
 * Spot swaps via the public, keyless Raydium Trade API
 * (https://transaction-v1.raydium.io) — the same surface the Raydium UI uses.
 *
 * Signing rule (non-negotiable): this connector BUILDS transactions; the
 * user's own wallet signs them. It never holds keys and never signs.
 * Broadcasting a user-signed transaction is available only behind the
 * explicit allowBroadcast opt-in (RAYDIUM_ALLOW_BROADCAST=1) and is the
 * fallback path — prefer letting the wallet broadcast itself.
 *
 * Quotes expire in ~30s: build and present promptly, never cache quotes.
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig, ProviderStatus } from '../types.js';
export interface RaydiumQuote {
    inputMint?: string;
    inputAmount?: string;
    outputMint?: string;
    outputAmount?: string;
    /** Minimum received after slippage. */
    otherAmountThreshold?: string;
    priceImpactPct?: number;
    routePlan?: unknown[];
    [key: string]: unknown;
}
export declare class RaydiumConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
    /** Quote a swap (read-only). Amounts are base units. */
    quote(params: {
        inputMint: string;
        outputMint: string;
        amount: number | string;
        slippageBps?: number;
    }): Promise<RaydiumQuote>;
    /**
     * Build an UNSIGNED swap transaction for `wallet` (fee payer) to sign in
     * the user's own wallet. Uses the fleet-verified GET /transaction/swap-base-in
     * flow; returns the base64 transaction plus the embedded quote details.
     */
    buildSwap(params: {
        inputMint: string;
        outputMint: string;
        amount: number | string;
        wallet: string;
        slippageBps?: number;
        priorityFeeMicroLamports?: number;
    }): Promise<{
        unsignedTx: string;
        swapResponse: RaydiumQuote;
    }>;
    /** USD prices for mints (api-v3). */
    prices<T = unknown>(mints: string[]): Promise<T>;
    /**
     * Broadcast a USER-SIGNED transaction (base64). Gated behind
     * allowBroadcast — the wallet-broadcast path is preferred.
     */
    broadcast(signedTxBase64: string): Promise<string>;
    status(): Promise<ProviderStatus>;
}
//# sourceMappingURL=raydium.d.ts.map