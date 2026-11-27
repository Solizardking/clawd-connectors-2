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

const HELIUS_REST_BASE = 'https://api.helius.dev';

export class HeliusConnector extends BaseConnector {
  protected restBase = HELIUS_REST_BASE;

  constructor(config: Partial<ProviderConfig> = {}) {
    super({ name: 'helius', apiKey: '', ...config });
  }

  /** Helius RPC/DAS endpoint (key in query — never logged by this package). */
  rpcEndpoint(): string {
    if (this.config.rpcUrl) return this.config.rpcUrl;
    const network = this.config.network === 'devnet' ? 'devnet' : 'mainnet';
    return `https://${network}.helius-rpc.com/?api-key=${this.config.apiKey}`;
  }

  private async rpcCall<T>(method: string, params: unknown): Promise<T> {
    const res = await fetch(this.rpcEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'clawd-connectors', method, params }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000),
    });
    if (!res.ok) throw new Error(`helius rpc ${method}: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as { result?: T; error?: { message?: string } };
    if (json.error) throw new Error(`helius rpc ${method}: ${json.error.message}`);
    return json.result as T;
  }

  /** Generic Solana JSON-RPC via Helius. */
  async rpc<T>(method: string, params: unknown[] = []): Promise<T> {
    return this.rpcCall<T>(method, params);
  }

  // ── DAS (Digital Asset Standard) reads ──────────────────────────────────

  async getAsset<T = unknown>(id: string): Promise<T> {
    return this.rpcCall<T>('getAsset', { id });
  }

  async getAssetsByOwner<T = unknown>(params: {
    ownerAddress: string;
    page?: number;
    limit?: number;
    showFungible?: boolean;
  }): Promise<T> {
    return this.rpcCall<T>('getAssetsByOwner', {
      page: 1,
      limit: 1000,
      ...params,
      options: { showFungible: params.showFungible ?? true },
    });
  }

  async searchAssets<T = unknown>(params: Record<string, unknown>): Promise<T> {
    return this.rpcCall<T>('searchAssets', params);
  }

  async getAssetProof<T = unknown>(id: string): Promise<T> {
    return this.rpcCall<T>('getAssetProof', { id });
  }

  // ── REST reads (api.helius.dev/v0) ──────────────────────────────────────

  private v0<T>(path: string): Promise<T> {
    const sep = path.includes('?') ? '&' : '?';
    return this.restGet<T>(`${path}${sep}api-key=${this.config.apiKey}`);
  }

  /** Native + token balances for an address. */
  async balances<T = unknown>(address: string): Promise<T> {
    return this.v0<T>(`/v0/addresses/${address}/balances`);
  }

  /** Parsed transaction history for an address. */
  async addressTransactions<T = unknown>(address: string): Promise<T> {
    return this.v0<T>(`/v0/addresses/${address}/transactions`);
  }

  /** Priority fee estimate for accounts at a fee level. */
  async priorityFeeEstimate<T = unknown>(params: {
    accountKeys: string[];
    priorityLevel?: 'Min' | 'Low' | 'Medium' | 'High' | 'VeryHigh' | 'UnsafeMax';
  }): Promise<T> {
    return this.rpcCall<T>('getPriorityFeeEstimate', {
      accountKeys: params.accountKeys,
      options: { priorityLevel: params.priorityLevel ?? 'Medium' },
    });
  }

  /**
   * Submit an ALREADY-SIGNED transaction via Helius Sender.
   * Gated behind allowBroadcast; uses skipPreflight + maxRetries 0 per the
   * fleet Sender rules. The caller supplies the signed bytes — this package
   * never signs.
   */
  async senderSubmit(signedTxBase64: string): Promise<string> {
    this.requireBroadcast('senderSubmit');
    const network = this.config.network === 'devnet' ? 'devnet' : 'mainnet';
    const url = `https://${network}.helius-rpc.com/fast?api-key=${this.config.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'clawd-connectors',
        method: 'sendTransaction',
        params: [
          signedTxBase64,
          { encoding: 'base64', skipPreflight: true, maxRetries: 0 },
        ],
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000),
    });
    if (!res.ok) throw new Error(`helius sender: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as { result?: string; error?: { message?: string } };
    if (json.error) throw new Error(`helius sender: ${json.error.message}`);
    return json.result as string;
  }
}
