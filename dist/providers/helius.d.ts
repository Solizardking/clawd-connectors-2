/**
 * Clawd Connectors — Helius
 * MCP connector (https://api.helius.dev/mcp) with the current fleet REST
 * wiring:
 * - JSON-RPC + DAS via https://<network>.helius-rpc.com/?api-key=<key>
 *   (override with HELIUS_RPC_URL / config.rpcUrl)
 * - Wallet/REST reads via https://api.helius.dev/v0 (api-key query param)
 * - Sender submit of ALREADY-SIGNED transactions, gated behind
 *   allowBroadcast (HELIUS_ALLOW_BROADCAST=1); fleet rule: Jupiter swap
 *   transactions are submitted via Sender with skipPreflight + maxRetries 0.
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig } from '../types.js';
export declare class HeliusConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
    /** Helius RPC/DAS endpoint (key in query — never logged by this package). */
    rpcEndpoint(): string;
    private rpcCall;
    /** Generic Solana JSON-RPC via Helius. */
    rpc<T>(method: string, params?: unknown[]): Promise<T>;
    getAsset<T = unknown>(id: string): Promise<T>;
    getAssetsByOwner<T = unknown>(params: {
        ownerAddress: string;
        page?: number;
        limit?: number;
        showFungible?: boolean;
    }): Promise<T>;
    searchAssets<T = unknown>(params: Record<string, unknown>): Promise<T>;
    getAssetProof<T = unknown>(id: string): Promise<T>;
    private v0;
    /** Native + token balances for an address. */
    balances<T = unknown>(address: string): Promise<T>;
    /** Parsed transaction history for an address. */
    addressTransactions<T = unknown>(address: string): Promise<T>;
    /** Priority fee estimate for accounts at a fee level. */
    priorityFeeEstimate<T = unknown>(params: {
        accountKeys: string[];
        priorityLevel?: 'Min' | 'Low' | 'Medium' | 'High' | 'VeryHigh' | 'UnsafeMax';
    }): Promise<T>;
    /**
     * Submit an ALREADY-SIGNED transaction via Helius Sender.
     * Gated behind allowBroadcast; uses skipPreflight + maxRetries 0 per the
     * fleet Sender rules. The caller supplies the signed bytes — this package
     * never signs.
     */
    senderSubmit(signedTxBase64: string): Promise<string>;
}
//# sourceMappingURL=helius.d.ts.map