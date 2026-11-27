/**
 * Clawd Connectors — Metaplex
 * Metaplex Core + Agent Registry surface.
 *
 * Reads: DAS (Digital Asset Standard) via a DAS-capable Solana RPC
 * (SOLANA_RPC_URL, or HELIUS_RPC_URL; DAS methods need a Helius-class RPC —
 * a plain RPC will reject them and the error surfaces as-is). DAS is how the
 * fleet reads agent identity: agent assets carry is_agent / asset_signer /
 * agent_token fields.
 *
 * Metadata: Pinata IPFS pinning (PINATA_JWT) — the fleet policy is IPFS via
 * Pinata for ALL Metaplex metadata, with ipfs://<CID> on-chain URIs.
 *
 * Writes: buildCreateAssetTx() builds a PARTIALLY-SIGNED Core create-asset
 * transaction — the ephemeral asset keypair signs, the USER signs as fee
 * payer in their own browser wallet. The agent never holds user keys.
 * Building needs the optional Metaplex Umi packages (see below); reads and
 * pinning work without them.
 *
 *   npm i @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults \
 *         @metaplex-foundation/mpl-core
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig, ProviderStatus } from '../types.js';
/** MPL Core program. */
export declare const MPL_CORE_PROGRAM = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";
/** Metaplex Agent Registry program (devnet, per the fleet registration skill). */
export declare const AGENT_REGISTRY_PROGRAM_DEVNET = "1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p";
export declare class MetaplexConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
    private rpcUrl;
    private das;
    /** Fetch one asset (Core asset, NFT, agent identity asset). */
    getAsset<T = unknown>(id: string): Promise<T>;
    /** All assets owned by a wallet (agent assets included). */
    getAssetsByOwner<T = unknown>(ownerAddress: string, page?: number, limit?: number): Promise<T>;
    /** Search assets — e.g. agent assets by creator/grouping filters. */
    searchAssets<T = unknown>(params: Record<string, unknown>): Promise<T>;
    private pinataHeaders;
    /** Pin a JSON metadata object; returns the ipfs:// URI for the on-chain uri field. */
    pinJson(name: string, metadata: Record<string, unknown>): Promise<{
        cid: string;
        uri: string;
    }>;
    /** Pin a file (image bytes) via multipart upload; returns the ipfs:// URI. */
    pinFile(name: string, bytes: Uint8Array, contentType?: string): Promise<{
        cid: string;
        uri: string;
    }>;
    /**
     * Build a partially-signed MPL Core create-asset transaction.
     * The ephemeral asset keypair signs here; the returned base64 transaction
     * still needs the fee payer's signature from the user's own wallet.
     * Requires the optional Umi packages listed in the file header.
     *
     * NOTE: this path is implemented against the documented Umi flow but is
     * NOT runtime-verified in this repo (the Umi packages are optional peers
     * and are not installed in the test environment). Reads and pinning above
     * are fully self-contained.
     */
    buildCreateAssetTx(params: {
        name: string;
        uri: string;
        owner: string;
        collection?: string;
    }): Promise<{
        assetAddress: string;
        partialTx: string;
    }>;
    status(): Promise<ProviderStatus>;
}
//# sourceMappingURL=metaplex.d.ts.map