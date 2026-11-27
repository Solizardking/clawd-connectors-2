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

const RAYDIUM_TRADE_API = 'https://transaction-v1.raydium.io';
const RAYDIUM_API_V3 = 'https://api-v3.raydium.io';
const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';

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

export class RaydiumConnector extends BaseConnector {
  protected restBase = RAYDIUM_TRADE_API;

  constructor(config: Partial<ProviderConfig> = {}) {
    super({ name: 'raydium', apiKey: '', ...config });
  }

  /** Quote a swap (read-only). Amounts are base units. */
  async quote(params: {
    inputMint: string;
    outputMint: string;
    amount: number | string;
    slippageBps?: number;
  }): Promise<RaydiumQuote> {
    const qs = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: String(params.amount),
      slippageBps: String(params.slippageBps ?? 50),
      txVersion: 'V0',
    });
    const res = await this.restGet<{ success: boolean; data?: RaydiumQuote; msg?: string }>(
      `/compute/swap-base-in?${qs.toString()}`,
    );
    if (!res.success || !res.data) {
      throw new Error(`raydium quote failed: ${res.msg ?? 'unknown error'}`);
    }
    return res.data;
  }

  /**
   * Build an UNSIGNED swap transaction for `wallet` (fee payer) to sign in
   * the user's own wallet. Uses the fleet-verified GET /transaction/swap-base-in
   * flow; returns the base64 transaction plus the embedded quote details.
   */
  async buildSwap(params: {
    inputMint: string;
    outputMint: string;
    amount: number | string;
    wallet: string;
    slippageBps?: number;
    priorityFeeMicroLamports?: number;
  }): Promise<{ unsignedTx: string; swapResponse: RaydiumQuote }> {
    const qs = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: String(params.amount),
      slippageBps: String(params.slippageBps ?? 50),
      wallet: params.wallet,
      txVersion: 'V0',
      computeUnitPriceMicroLamports: String(params.priorityFeeMicroLamports ?? 50000),
    });
    const res = await this.restGet<{
      success: boolean;
      data?: { tx?: { transaction: string }; swapResponse?: RaydiumQuote };
      msg?: string;
    }>(`/transaction/swap-base-in?${qs.toString()}`);
    if (!res.success || !res.data?.tx?.transaction) {
      throw new Error(`raydium build failed: ${res.msg ?? 'unknown error'}`);
    }
    return {
      unsignedTx: res.data.tx.transaction,
      swapResponse: res.data.swapResponse ?? ({} as RaydiumQuote),
    };
  }

  /** USD prices for mints (api-v3). */
  async prices<T = unknown>(mints: string[]): Promise<T> {
    const res = await fetch(
      `${RAYDIUM_API_V3}/mint/price?mints=${mints.map(encodeURIComponent).join(',')}`,
      { signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000) },
    );
    if (!res.ok) throw new Error(`raydium prices: ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  }

  /**
   * Broadcast a USER-SIGNED transaction (base64). Gated behind
   * allowBroadcast — the wallet-broadcast path is preferred.
   */
  async broadcast(signedTxBase64: string): Promise<string> {
    this.requireBroadcast('broadcast');
    const rpcUrl = this.config.rpcUrl || DEFAULT_RPC;
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendTransaction',
        params: [signedTxBase64, { encoding: 'base64', maxRetries: 3 }],
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000),
    });
    if (!res.ok) throw new Error(`raydium broadcast: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as { result?: string; error?: { message?: string } };
    if (json.error) throw new Error(`raydium broadcast: ${json.error.message}`);
    return json.result as string;
  }

  async status(): Promise<ProviderStatus> {
    return {
      provider: this.id,
      configured: true, // keyless Trade API
      restBase: this.config.restBase ?? this.restBase,
      note: `builds unsigned txs only — user wallet signs; broadcast=${this.config.allowBroadcast ? 'on' : 'off (fail-closed)'}`,
    };
  }
}
