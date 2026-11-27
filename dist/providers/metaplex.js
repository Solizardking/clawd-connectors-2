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
/** MPL Core program. */
export const MPL_CORE_PROGRAM = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d';
/** Metaplex Agent Registry program (devnet, per the fleet registration skill). */
export const AGENT_REGISTRY_PROGRAM_DEVNET = '1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p';
const PINATA_API = 'https://api.pinata.cloud';
const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';
export class MetaplexConnector extends BaseConnector {
    restBase = PINATA_API;
    constructor(config = {}) {
        super({ name: 'metaplex', apiKey: '', ...config });
    }
    rpcUrl() {
        return this.config.rpcUrl || DEFAULT_RPC;
    }
    async das(method, params) {
        const res = await fetch(this.rpcUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 'clawd-connectors', method, params }),
            signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000),
        });
        if (!res.ok)
            throw new Error(`metaplex DAS ${method}: ${res.status} ${res.statusText}`);
        const json = (await res.json());
        if (json.error) {
            throw new Error(`metaplex DAS ${method}: ${json.error.message} (DAS needs a DAS-capable RPC — set SOLANA_RPC_URL to a Helius endpoint)`);
        }
        return json.result;
    }
    // ── DAS reads ───────────────────────────────────────────────────────────
    /** Fetch one asset (Core asset, NFT, agent identity asset). */
    async getAsset(id) {
        return this.das('getAsset', { id });
    }
    /** All assets owned by a wallet (agent assets included). */
    async getAssetsByOwner(ownerAddress, page = 1, limit = 1000) {
        return this.das('getAssetsByOwner', { ownerAddress, page, limit });
    }
    /** Search assets — e.g. agent assets by creator/grouping filters. */
    async searchAssets(params) {
        return this.das('searchAssets', params);
    }
    // ── Pinata metadata pinning ─────────────────────────────────────────────
    pinataHeaders() {
        if (!this.config.pinataJwt) {
            throw new Error('metaplex: PINATA_JWT not configured — metadata pinning is unavailable');
        }
        return { Authorization: `Bearer ${this.config.pinataJwt}` };
    }
    /** Pin a JSON metadata object; returns the ipfs:// URI for the on-chain uri field. */
    async pinJson(name, metadata) {
        const res = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.pinataHeaders() },
            body: JSON.stringify({ pinataMetadata: { name }, pinataContent: metadata }),
            signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000),
        });
        if (!res.ok)
            throw new Error(`metaplex pinJson: ${res.status} ${res.statusText}`);
        const json = (await res.json());
        return { cid: json.IpfsHash, uri: `ipfs://${json.IpfsHash}` };
    }
    /** Pin a file (image bytes) via multipart upload; returns the ipfs:// URI. */
    async pinFile(name, bytes, contentType = 'application/octet-stream') {
        const form = new FormData();
        form.append('file', new Blob([bytes], { type: contentType }), name);
        form.append('pinataMetadata', JSON.stringify({ name }));
        const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
            method: 'POST',
            headers: this.pinataHeaders(),
            body: form,
            signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000),
        });
        if (!res.ok)
            throw new Error(`metaplex pinFile: ${res.status} ${res.statusText}`);
        const json = (await res.json());
        return { cid: json.IpfsHash, uri: `ipfs://${json.IpfsHash}` };
    }
    // ── Core mint build (browser-signing flow) ──────────────────────────────
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
    async buildCreateAssetTx(params) {
        const specifiers = [
            '@metaplex-foundation/umi',
            '@metaplex-foundation/umi-bundle-defaults',
            '@metaplex-foundation/mpl-core',
        ];
        const mods = {};
        for (const spec of specifiers) {
            try {
                // Non-literal specifier: optional peer dependency, resolved at runtime.
                mods[spec] = await import(/* @vite-ignore */ spec);
            }
            catch {
                throw new Error(`metaplex: buildCreateAssetTx needs the optional Metaplex Umi packages — ` +
                    `install: npm i ${specifiers.join(' ')}`);
            }
        }
        const { generateSigner, publicKey } = mods['@metaplex-foundation/umi'];
        const { createUmi } = mods['@metaplex-foundation/umi-bundle-defaults'];
        const { createV1, fetchCollection, mplCore } = mods['@metaplex-foundation/mpl-core'];
        const umi = createUmi(this.rpcUrl()).use(mplCore());
        const asset = generateSigner(umi);
        const collection = params.collection
            ? await fetchCollection(umi, publicKey(params.collection))
            : undefined;
        const tx = await createV1(umi, {
            asset,
            name: params.name,
            uri: params.uri,
            owner: publicKey(params.owner),
            ...(collection ? { collection } : {}),
        }).buildWithLatestBlockhash(umi);
        // Partial signature: the ephemeral asset keypair only. The fee payer
        // (the user's wallet) signs the same transaction afterwards.
        const partial = await asset.signTransaction(tx);
        const serialized = umi.transactions.serialize(partial);
        return {
            assetAddress: String(asset.publicKey),
            partialTx: Buffer.from(serialized).toString('base64'),
        };
    }
    async status() {
        return {
            provider: this.id,
            configured: true,
            restBase: PINATA_API,
            note: `dasRpc=${this.rpcUrl() === DEFAULT_RPC ? 'public (no DAS — set SOLANA_RPC_URL)' : 'configured'} ` +
                `pinata=${this.config.pinataJwt ? 'set' : 'missing'} coreProgram=${MPL_CORE_PROGRAM}`,
        };
    }
}
//# sourceMappingURL=metaplex.js.map