/**
 * Clawd Connectors — MCP server tool registry
 *
 * Maps the provider classes onto MCP tools for the package's own MCP
 * server (src/mcp/server.ts, bin `clawd-connectors-mcp`).
 *
 * Exposure rules (same fail-closed model as the providers themselves):
 * - READ tools are always registered: market data, snapshots, DAS reads,
 *   quotes, and UNSIGNED transaction builds (the user's wallet always
 *   signs — a build moves no value).
 * - VALUE-MOVING tools are registered ONLY when the matching opt-in is
 *   on, mirroring the provider gates:
 *     imperial_place_order / imperial_cancel_order /
 *       imperial_build_deposit_tx      <- IMPERIAL_ALLOW_TRADING=1
 *     jupiter_swap_execute             <- JUPITER_ALLOW_TRADING=1
 *     raydium_broadcast                <- RAYDIUM_ALLOW_BROADCAST=1
 *     helius_sender_submit             <- HELIUS_ALLOW_BROADCAST=1
 *   Even then, the provider re-checks its own gate (and Imperial also
 *   requires IMPERIAL_JWT) — the registry gate is the first of two locks.
 * - Metaplex Pinata pinning is a credentialed write (not value-moving):
 *   registered only when PINATA_JWT is configured.
 * - Clawd gateway calls go through the Clawd connector with NO payment
 *   handler: payable tools surface the x402 challenge as a tool error
 *   (PaymentRequiredError). This server never pays.
 */
import { createConnectors, type AllConnectors } from '../index.js';
import { getEnvConfig } from '../config.js';
import type { ConnectorsOptions } from '../types.js';
import type { BackpackConnector } from '../providers/backpack.js';
import type { PhoenixConnector } from '../providers/phoenix.js';
import type { SunriseConnector } from '../providers/sunrise.js';
import type { RaydiumConnector } from '../providers/raydium.js';
import type { ImperialConnector, ImperialOrder } from '../providers/imperial.js';
import type { HeliusConnector } from '../providers/helius.js';
import type { JupiterConnector } from '../providers/jupiter.js';
import type { MetaplexConnector } from '../providers/metaplex.js';
import type { ClawdConnector as ClawdConnectorClass, ClawdSurface } from '../providers/clawd.js';
import type { DFlowConnector } from '../providers/dflow.js';
import type { BirdeyeConnector } from '../providers/birdeye.js';

export type ToolGate =
  | 'imperialTrading'
  | 'jupiterTrading'
  | 'raydiumBroadcast'
  | 'heliusBroadcast'
  | 'pinata';

export interface ServerToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** When set, the tool is registered only if the matching opt-in is on. */
  gate?: ToolGate;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolGateOptions {
  imperialAllowTrading?: boolean;
  jupiterAllowTrading?: boolean;
  raydiumAllowBroadcast?: boolean;
  heliusAllowBroadcast?: boolean;
  pinataConfigured?: boolean;
}

// ── schema helpers ────────────────────────────────────────────────────────

const S = {
  str: { type: 'string' } as Record<string, unknown>,
  num: { type: 'number' } as Record<string, unknown>,
  bool: { type: 'boolean' } as Record<string, unknown>,
  strArr: { type: 'array', items: { type: 'string' } } as Record<string, unknown>,
  anyObj: { type: 'object', additionalProperties: true } as Record<string, unknown>,
};

function obj(
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> {
  return { type: 'object', properties, required, additionalProperties: true };
}

const NO_ARGS: Record<string, unknown> = { type: 'object', properties: {} };

// ── registry ──────────────────────────────────────────────────────────────

export function buildToolRegistry(
  connectors: AllConnectors,
  gates: ToolGateOptions = {},
): ServerToolDef[] {
  const backpack = connectors.backpack as unknown as BackpackConnector;
  const phoenix = connectors.phoenix as unknown as PhoenixConnector;
  const sunrise = connectors.sunrise as unknown as SunriseConnector;
  const raydium = connectors.raydium as unknown as RaydiumConnector;
  const imperial = connectors.imperial as unknown as ImperialConnector;
  const helius = connectors.helius as unknown as HeliusConnector;
  const jupiter = connectors.jupiter as unknown as JupiterConnector;
  const metaplex = connectors.metaplex as unknown as MetaplexConnector;
  const clawd = connectors.clawd as unknown as ClawdConnectorClass;
  const dflow = connectors.dflow as unknown as DFlowConnector;
  const birdeye = connectors.birdeye as unknown as BirdeyeConnector;

  const tools: ServerToolDef[] = [];
  const add = (t: ServerToolDef) => tools.push(t);

  // ── meta ────────────────────────────────────────────────────────────────
  add({
    name: 'connectors_status',
    description:
      'Status of every Clawd Connectors provider (configured, endpoint, live check where keyless).',
    inputSchema: NO_ARGS,
    handler: async () => {
      const out: Record<string, unknown> = {};
      for (const [id, conn] of Object.entries(connectors)) {
        out[id] = await conn.status();
      }
      return out;
    },
  });

  // ── Backpack (keyless, read-only) ───────────────────────────────────────
  add({ name: 'backpack_exchange_status', description: 'Backpack exchange status.', inputSchema: NO_ARGS, handler: () => backpack.exchangeStatus() });
  add({
    name: 'backpack_markets',
    description: 'Backpack markets; optional quoteAsset filter (e.g. USDC).',
    inputSchema: obj({ quoteAsset: S.str }),
    handler: (a) => backpack.markets(a.quoteAsset as string | undefined),
  });
  add({
    name: 'backpack_ticker',
    description: 'Backpack 24h ticker for one symbol, e.g. SOL_USDC.',
    inputSchema: obj({ symbol: S.str }, ['symbol']),
    handler: (a) => backpack.ticker(a.symbol as string),
  });
  add({ name: 'backpack_tickers', description: 'All Backpack tickers.', inputSchema: NO_ARGS, handler: () => backpack.tickers() });
  add({
    name: 'backpack_depth',
    description: 'Backpack order book depth for a symbol.',
    inputSchema: obj({ symbol: S.str, limit: S.num }, ['symbol']),
    handler: (a) => backpack.depth(a.symbol as string, a.limit as number | undefined),
  });
  add({
    name: 'backpack_trades',
    description: 'Recent Backpack trades for a symbol.',
    inputSchema: obj({ symbol: S.str, limit: S.num }, ['symbol']),
    handler: (a) => backpack.trades(a.symbol as string, (a.limit as number | undefined) ?? 25),
  });
  add({
    name: 'backpack_klines',
    description: 'Backpack candles. startTime/endTime are SECONDS. Intervals: 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M.',
    inputSchema: obj({ symbol: S.str, interval: S.str, startTime: S.num, endTime: S.num }, ['symbol', 'interval', 'startTime', 'endTime']),
    handler: (a) =>
      backpack.klines({
        symbol: a.symbol as string,
        interval: a.interval as string,
        startTime: a.startTime as number,
        endTime: a.endTime as number,
      }),
  });

  // ── Phoenix (keyless, read-only) ────────────────────────────────────────
  add({ name: 'phoenix_exchange', description: 'Phoenix perps: full exchange configuration.', inputSchema: NO_ARGS, handler: () => phoenix.exchange() });
  add({ name: 'phoenix_exchange_keys', description: 'Phoenix perps: exchange pubkeys.', inputSchema: NO_ARGS, handler: () => phoenix.exchangeKeys() });
  add({ name: 'phoenix_exchange_status', description: 'Phoenix perps: exchange status.', inputSchema: NO_ARGS, handler: () => phoenix.exchangeStatus() });
  add({ name: 'phoenix_snapshot', description: 'Phoenix perps: exchange state snapshot (version, slot, status).', inputSchema: NO_ARGS, handler: () => phoenix.snapshot() });
  add({ name: 'phoenix_markets', description: 'Phoenix perps: all markets.', inputSchema: NO_ARGS, handler: () => phoenix.markets() });
  add({
    name: 'phoenix_market',
    description: 'Phoenix perps: one market by symbol, e.g. SOL-PERP.',
    inputSchema: obj({ symbol: S.str }, ['symbol']),
    handler: (a) => phoenix.market(a.symbol as string),
  });
  add({
    name: 'phoenix_orderbook',
    description: 'Phoenix perps: order book for a market symbol.',
    inputSchema: obj({ symbol: S.str }, ['symbol']),
    handler: (a) => phoenix.orderbook(a.symbol as string),
  });
  add({
    name: 'phoenix_mark_price',
    description: 'Phoenix perps: mark price for a market symbol.',
    inputSchema: obj({ symbol: S.str }, ['symbol']),
    handler: (a) => phoenix.markPrice(a.symbol as string),
  });
  add({
    name: 'phoenix_market_stats',
    description: 'Phoenix perps: market stats history for a symbol.',
    inputSchema: obj({ symbol: S.str }, ['symbol']),
    handler: (a) => phoenix.marketStats(a.symbol as string),
  });

  // ── Sunrise (keyless snapshot) ──────────────────────────────────────────
  add({
    name: 'sunrise_snapshot',
    description: 'Sunrise tokenized-equities snapshot (carries generatedAt + stalenessSeconds — surface staleness, prices are not live).',
    inputSchema: obj({ refresh: S.bool }),
    handler: (a) => sunrise.snapshot(a.refresh === true),
  });
  add({ name: 'sunrise_assets', description: 'All Sunrise assets in the current snapshot.', inputSchema: NO_ARGS, handler: () => sunrise.listAssets() });
  add({
    name: 'sunrise_asset',
    description: 'One Sunrise asset by symbol, e.g. AAPL (case-insensitive).',
    inputSchema: obj({ symbol: S.str }, ['symbol']),
    handler: async (a) => (await sunrise.asset(a.symbol as string)) ?? { found: false, symbol: a.symbol },
  });

  // ── Raydium (keyless quote + unsigned builds) ───────────────────────────
  add({
    name: 'raydium_quote',
    description: 'Raydium swap quote (read-only; amounts are base units; quotes expire in ~30s, never cache).',
    inputSchema: obj({ inputMint: S.str, outputMint: S.str, amount: S.num, slippageBps: S.num }, ['inputMint', 'outputMint', 'amount']),
    handler: (a) =>
      raydium.quote({
        inputMint: a.inputMint as string,
        outputMint: a.outputMint as string,
        amount: a.amount as number,
        slippageBps: a.slippageBps as number | undefined,
      }),
  });
  add({
    name: 'raydium_build_swap',
    description: 'Build an UNSIGNED Raydium swap transaction for `wallet` to sign in the user\'s own wallet. This tool never signs and never broadcasts.',
    inputSchema: obj(
      { inputMint: S.str, outputMint: S.str, amount: S.num, wallet: S.str, slippageBps: S.num, priorityFeeMicroLamports: S.num },
      ['inputMint', 'outputMint', 'amount', 'wallet'],
    ),
    handler: (a) =>
      raydium.buildSwap({
        inputMint: a.inputMint as string,
        outputMint: a.outputMint as string,
        amount: a.amount as number,
        wallet: a.wallet as string,
        slippageBps: a.slippageBps as number | undefined,
        priorityFeeMicroLamports: a.priorityFeeMicroLamports as number | undefined,
      }),
  });
  add({
    name: 'raydium_prices',
    description: 'Raydium USD prices for a list of mints.',
    inputSchema: obj({ mints: S.strArr }, ['mints']),
    handler: (a) => raydium.prices(a.mints as string[]),
  });
  add({
    name: 'raydium_broadcast',
    description: 'Broadcast a USER-SIGNED Raydium transaction (base64). Registered only when RAYDIUM_ALLOW_BROADCAST=1; the wallet-broadcast path is preferred.',
    inputSchema: obj({ signedTxBase64: S.str }, ['signedTxBase64']),
    gate: 'raydiumBroadcast',
    handler: async (a) => ({ signature: await raydium.broadcast(a.signedTxBase64 as string) }),
  });

  // ── Imperial — public reads (keyless) ───────────────────────────────────
  add({ name: 'imperial_health', description: 'Imperial router status.', inputSchema: NO_ARGS, handler: () => imperial.health() });
  add({ name: 'imperial_mark_prices', description: 'Imperial mark prices across venues.', inputSchema: NO_ARGS, handler: () => imperial.markPrices() });
  add({ name: 'imperial_funding_rates', description: 'Imperial funding rates.', inputSchema: NO_ARGS, handler: () => imperial.fundingRates() });
  add({
    name: 'imperial_route',
    description: 'Imperial routing quote; pass route query params as string fields.',
    inputSchema: { type: 'object', additionalProperties: { type: 'string' } },
    handler: (a) => imperial.route(a as Record<string, string>),
  });
  add({ name: 'imperial_phoenix_markets', description: 'Imperial: Phoenix-routed markets.', inputSchema: NO_ARGS, handler: () => imperial.phoenixMarkets() });
  add({
    name: 'imperial_phoenix_depth',
    description: 'Imperial: Phoenix depth, optionally for one symbol.',
    inputSchema: obj({ symbol: S.str }),
    handler: (a) => imperial.phoenixDepth(a.symbol as string | undefined),
  });
  add({ name: 'imperial_stats_summary', description: 'Imperial stats summary.', inputSchema: NO_ARGS, handler: () => imperial.statsSummary() });
  add({
    name: 'imperial_stats_markets',
    description: 'Imperial per-market stats for a period (24h | 7d | 30d).',
    inputSchema: obj({ period: S.str }),
    handler: (a) => imperial.statsMarkets((a.period as '24h' | '7d' | '30d' | undefined) ?? '24h'),
  });
  add({ name: 'imperial_stats_volume', description: 'Imperial volume stats.', inputSchema: NO_ARGS, handler: () => imperial.statsVolume() });
  add({ name: 'imperial_stats_open_interest', description: 'Imperial open-interest stats.', inputSchema: NO_ARGS, handler: () => imperial.statsOpenInterest() });
  add({
    name: 'imperial_positions',
    description: 'Imperial positions for a wallet (public read; optional underwriter filter).',
    inputSchema: obj({ walletAddress: S.str, underwriter: S.num }, ['walletAddress']),
    handler: (a) => imperial.positions(a.walletAddress as string, a.underwriter as number | undefined),
  });
  add({
    name: 'imperial_orders',
    description: 'Imperial open orders for a wallet (public read).',
    inputSchema: obj({ walletAddress: S.str }, ['walletAddress']),
    handler: (a) => imperial.orders(a.walletAddress as string),
  });
  add({
    name: 'imperial_trades',
    description: 'Imperial trades for a wallet (public read).',
    inputSchema: obj({ walletAddress: S.str }, ['walletAddress']),
    handler: (a) => imperial.trades(a.walletAddress as string),
  });
  add({
    name: 'imperial_pnl_history',
    description: 'Imperial PnL history for a wallet (resolution 1h | 1d).',
    inputSchema: obj({ walletAddress: S.str, resolution: S.str }, ['walletAddress']),
    handler: (a) => imperial.pnlHistory(a.walletAddress as string, (a.resolution as '1h' | '1d' | undefined) ?? '1d'),
  });
  add({ name: 'imperial_touch_markets', description: 'Imperial Touch (binary) markets.', inputSchema: NO_ARGS, handler: () => imperial.touchMarkets() });
  add({ name: 'imperial_touch_deals', description: 'Imperial Touch deals.', inputSchema: NO_ARGS, handler: () => imperial.touchDeals() });
  add({
    name: 'imperial_touch_positions',
    description: 'Imperial Touch positions for a wallet.',
    inputSchema: obj({ walletAddress: S.str }, ['walletAddress']),
    handler: (a) => imperial.touchPositions(a.walletAddress as string),
  });
  add({ name: 'imperial_armada_markets', description: 'Imperial Armada markets.', inputSchema: NO_ARGS, handler: () => imperial.armadaMarkets() });
  add({ name: 'imperial_armada_status', description: 'Imperial Armada status.', inputSchema: NO_ARGS, handler: () => imperial.armadaStatus() });

  // ── Imperial — JWT reads (require IMPERIAL_JWT; fail cleanly without) ──
  add({ name: 'imperial_balances', description: 'Imperial per-profile USDC balances (µUSD). Requires IMPERIAL_JWT.', inputSchema: NO_ARGS, handler: () => imperial.balances() });
  add({ name: 'imperial_points', description: 'Imperial points for the active season. Requires IMPERIAL_JWT.', inputSchema: NO_ARGS, handler: () => imperial.points() });
  add({ name: 'imperial_partner_registration', description: 'Imperial partner registration status. Requires IMPERIAL_JWT.', inputSchema: NO_ARGS, handler: () => imperial.partnerRegistration() });
  add({
    name: 'imperial_preflight',
    description: 'Imperial order preflight — asks whether an order WOULD be accepted without placing it (non-mutating). Requires IMPERIAL_JWT.',
    inputSchema: obj({ order: S.anyObj }, ['order']),
    handler: (a) => imperial.preflight(a.order as unknown as ImperialOrder),
  });

  // ── Imperial — trading (gated: IMPERIAL_ALLOW_TRADING=1 + JWT) ─────────
  add({
    name: 'imperial_place_order',
    description: 'Place an Imperial order. Registered only when IMPERIAL_ALLOW_TRADING=1. HTTP 200 ≠ accepted — inspect success/error in the result. Live orders need the user\'s per-trade approval in the calling app.',
    inputSchema: obj({ order: S.anyObj }, ['order']),
    gate: 'imperialTrading',
    handler: (a) => imperial.placeOrder(a.order as unknown as ImperialOrder),
  });
  add({
    name: 'imperial_cancel_order',
    description: 'Cancel an Imperial order by PDA. Registered only when IMPERIAL_ALLOW_TRADING=1.',
    inputSchema: obj({ wallet: S.str, profileIndex: S.num, orderPda: S.str, cascadeChildren: S.bool }, ['wallet', 'profileIndex', 'orderPda']),
    gate: 'imperialTrading',
    handler: (a) =>
      imperial.cancelOrder({
        wallet: a.wallet as string,
        profileIndex: a.profileIndex as number,
        orderPda: a.orderPda as string,
        cascadeChildren: a.cascadeChildren as boolean | undefined,
      }),
  });
  add({
    name: 'imperial_build_deposit_tx',
    description: 'Build an Imperial deposit/withdraw transaction (user wallet signs before submit). Registered only when IMPERIAL_ALLOW_TRADING=1.',
    inputSchema: obj(
      { wallet: S.str, profileIndex: S.num, mode: S.str, amount: S.num, deferOperatorSignature: S.bool },
      ['wallet', 'profileIndex', 'mode', 'amount'],
    ),
    gate: 'imperialTrading',
    handler: (a) =>
      imperial.buildDepositTx({
        wallet: a.wallet as string,
        profileIndex: a.profileIndex as number,
        mode: a.mode as 'deposit' | 'withdraw',
        amount: a.amount as number,
        deferOperatorSignature: a.deferOperatorSignature as boolean | undefined,
      }),
  });

  // ── Helius — RPC/DAS + REST reads (HELIUS_API_KEY) ──────────────────────
  add({
    name: 'helius_get_asset',
    description: 'Helius DAS: fetch one asset by id.',
    inputSchema: obj({ id: S.str }, ['id']),
    handler: (a) => helius.getAsset(a.id as string),
  });
  add({
    name: 'helius_get_assets_by_owner',
    description: 'Helius DAS: assets owned by a wallet.',
    inputSchema: obj({ ownerAddress: S.str, page: S.num, limit: S.num, showFungible: S.bool }, ['ownerAddress']),
    handler: (a) =>
      helius.getAssetsByOwner({
        ownerAddress: a.ownerAddress as string,
        page: a.page as number | undefined,
        limit: a.limit as number | undefined,
        showFungible: a.showFungible as boolean | undefined,
      }),
  });
  add({
    name: 'helius_search_assets',
    description: 'Helius DAS: searchAssets with DAS filter params (passed through).',
    inputSchema: { type: 'object', additionalProperties: true },
    handler: (a) => helius.searchAssets(a),
  });
  add({
    name: 'helius_get_asset_proof',
    description: 'Helius DAS: Merkle proof for a compressed asset.',
    inputSchema: obj({ id: S.str }, ['id']),
    handler: (a) => helius.getAssetProof(a.id as string),
  });
  add({
    name: 'helius_balances',
    description: 'Helius: native + token balances for an address.',
    inputSchema: obj({ address: S.str }, ['address']),
    handler: (a) => helius.balances(a.address as string),
  });
  add({
    name: 'helius_address_transactions',
    description: 'Helius: parsed transaction history for an address.',
    inputSchema: obj({ address: S.str }, ['address']),
    handler: (a) => helius.addressTransactions(a.address as string),
  });
  add({
    name: 'helius_priority_fee_estimate',
    description: 'Helius: priority fee estimate for account keys (level Min|Low|Medium|High|VeryHigh|UnsafeMax).',
    inputSchema: obj({ accountKeys: S.strArr, priorityLevel: S.str }, ['accountKeys']),
    handler: (a) =>
      helius.priorityFeeEstimate({
        accountKeys: a.accountKeys as string[],
        priorityLevel: a.priorityLevel as 'Medium' | undefined,
      }),
  });
  add({
    name: 'helius_sender_submit',
    description: 'Submit an ALREADY-SIGNED transaction via Helius Sender (skipPreflight, maxRetries 0). Registered only when HELIUS_ALLOW_BROADCAST=1. This package never signs.',
    inputSchema: obj({ signedTxBase64: S.str }, ['signedTxBase64']),
    gate: 'heliusBroadcast',
    handler: async (a) => ({ signature: await helius.senderSubmit(a.signedTxBase64 as string) }),
  });

  // ── Jupiter — reads + unsigned builds (JUPITER_API_KEY) ─────────────────
  add({
    name: 'jupiter_swap_order',
    description: 'Jupiter Swap V2 order: quote + UNSIGNED transaction for `taker` to sign in their own wallet.',
    inputSchema: obj({ inputMint: S.str, outputMint: S.str, amount: S.num, taker: S.str, slippageBps: S.num }, ['inputMint', 'outputMint', 'amount', 'taker']),
    handler: (a) =>
      jupiter.swapOrder({
        inputMint: a.inputMint as string,
        outputMint: a.outputMint as string,
        amount: a.amount as number,
        taker: a.taker as string,
        slippageBps: a.slippageBps as number | undefined,
      }),
  });
  add({
    name: 'jupiter_quote',
    description: 'Jupiter quote convenience over Swap V2 (requires a taker wallet).',
    inputSchema: obj({ inputMint: S.str, outputMint: S.str, amount: S.num, slippageBps: S.num, taker: S.str }, ['inputMint', 'outputMint', 'amount', 'taker']),
    handler: (a) =>
      jupiter.quote({
        inputMint: a.inputMint as string,
        outputMint: a.outputMint as string,
        amount: a.amount as number,
        slippageBps: a.slippageBps as number | undefined,
        taker: a.taker as string,
      }),
  });
  add({
    name: 'jupiter_shield',
    description: 'Jupiter Token Shield: safety check for mints before displaying them.',
    inputSchema: obj({ mints: S.strArr }, ['mints']),
    handler: (a) => jupiter.shield(a.mints as string[]),
  });
  add({
    name: 'jupiter_search_tokens',
    description: 'Jupiter Tokens v2 search by name, symbol, or mint.',
    inputSchema: obj({ query: S.str }, ['query']),
    handler: (a) => jupiter.searchTokens(a.query as string),
  });
  add({
    name: 'jupiter_prices',
    description: 'Jupiter Price v3 for a list of mints.',
    inputSchema: obj({ ids: S.strArr }, ['ids']),
    handler: (a) => jupiter.prices(a.ids as string[]),
  });
  add({
    name: 'jupiter_trigger_orders',
    description: 'Jupiter Trigger (limit) orders for a wallet.',
    inputSchema: obj({ owner: S.str }, ['owner']),
    handler: (a) => jupiter.triggerOrders(a.owner as string),
  });
  add({
    name: 'jupiter_trigger_create_order',
    description: 'Build an UNSIGNED Jupiter Trigger create-order transaction (user signs + submits). Body is the Trigger v2 createOrder payload, passed through.',
    inputSchema: obj({ body: S.anyObj }, ['body']),
    handler: (a) => jupiter.triggerCreateOrder(a.body as Record<string, unknown>),
  });
  add({
    name: 'jupiter_trigger_cancel_order',
    description: 'Build an UNSIGNED Jupiter Trigger cancel-order transaction (user signs + submits). Body is the Trigger v2 cancelOrder payload, passed through.',
    inputSchema: obj({ body: S.anyObj }, ['body']),
    handler: (a) => jupiter.triggerCancelOrder(a.body as Record<string, unknown>),
  });
  add({
    name: 'jupiter_recurring_orders',
    description: 'Jupiter Recurring (DCA) orders for a wallet.',
    inputSchema: obj({ owner: S.str }, ['owner']),
    handler: (a) => jupiter.recurringOrders(a.owner as string),
  });
  add({
    name: 'jupiter_swap_execute',
    description: 'Execute a user-signed Jupiter Swap V2 transaction. Registered only when JUPITER_ALLOW_TRADING=1. Pass the requestId from jupiter_swap_order.',
    inputSchema: obj({ signedTransaction: S.str, requestId: S.str }, ['signedTransaction', 'requestId']),
    gate: 'jupiterTrading',
    handler: (a) =>
      jupiter.swapExecute({
        signedTransaction: a.signedTransaction as string,
        requestId: a.requestId as string,
      }),
  });

  // ── Metaplex — DAS reads + pinning + Core build ─────────────────────────
  add({
    name: 'metaplex_get_asset',
    description: 'Metaplex DAS read: one asset (Core asset / agent identity asset) by id. Needs a DAS-capable SOLANA_RPC_URL.',
    inputSchema: obj({ id: S.str }, ['id']),
    handler: (a) => metaplex.getAsset(a.id as string),
  });
  add({
    name: 'metaplex_get_assets_by_owner',
    description: 'Metaplex DAS read: assets owned by a wallet (agent assets included).',
    inputSchema: obj({ ownerAddress: S.str, page: S.num, limit: S.num }, ['ownerAddress']),
    handler: (a) =>
      metaplex.getAssetsByOwner(
        a.ownerAddress as string,
        (a.page as number | undefined) ?? 1,
        (a.limit as number | undefined) ?? 1000,
      ),
  });
  add({
    name: 'metaplex_search_assets',
    description: 'Metaplex DAS read: searchAssets with filter params (passed through).',
    inputSchema: { type: 'object', additionalProperties: true },
    handler: (a) => metaplex.searchAssets(a),
  });
  add({
    name: 'metaplex_pin_json',
    description: 'Pin a JSON metadata object to IPFS via Pinata; returns the ipfs:// URI for the on-chain uri field. Registered only when PINATA_JWT is configured.',
    inputSchema: obj({ name: S.str, metadata: S.anyObj }, ['name', 'metadata']),
    gate: 'pinata',
    handler: (a) => metaplex.pinJson(a.name as string, a.metadata as Record<string, unknown>),
  });
  add({
    name: 'metaplex_pin_file',
    description: 'Pin file bytes (base64) to IPFS via Pinata; returns the ipfs:// URI. Registered only when PINATA_JWT is configured.',
    inputSchema: obj({ name: S.str, base64: S.str, contentType: S.str }, ['name', 'base64']),
    gate: 'pinata',
    handler: (a) =>
      metaplex.pinFile(
        a.name as string,
        new Uint8Array(Buffer.from(a.base64 as string, 'base64')),
        (a.contentType as string | undefined) ?? 'application/octet-stream',
      ),
  });
  add({
    name: 'metaplex_build_create_asset_tx',
    description: 'Build a PARTIALLY-SIGNED MPL Core create-asset transaction — the ephemeral asset keypair signs here, the user signs as fee payer in their own wallet. Needs the optional Umi peer packages (see package docs); this build path is not runtime-verified in the repo test suite.',
    inputSchema: obj({ name: S.str, uri: S.str, owner: S.str, collection: S.str }, ['name', 'uri', 'owner']),
    handler: (a) =>
      metaplex.buildCreateAssetTx({
        name: a.name as string,
        uri: a.uri as string,
        owner: a.owner as string,
        collection: a.collection as string | undefined,
      }),
  });

  // ── Clawd — the whole Clawd Compute surface via meta-tools ──────────────
  add({
    name: 'clawd_surfaces',
    description: 'List the Clawd Compute surfaces fronted by the Clawd connector (gateway, equities, boards) with URLs and last-probed tool counts.',
    inputSchema: NO_ARGS,
    handler: async () => clawd.surfaces(),
  });
  add({
    name: 'clawd_list_tools',
    description: 'List tools on one Clawd surface (gateway | equities | decide | perps | map | bubbles | monitor | heat | sun; default gateway).',
    inputSchema: obj({ surface: S.str }),
    handler: (a) => clawd.listTools((a.surface as ClawdSurface | undefined) ?? 'gateway'),
  });
  add({
    name: 'clawd_call_tool',
    description: 'Call a tool on a Clawd surface (default gateway). Gateway tools are x402 pay-per-call: with no payment handler configured (this server never configures one), payable calls return the 402 challenge as an error instead of paying.',
    inputSchema: obj({ name: S.str, args: S.anyObj, surface: S.str }, ['name']),
    handler: (a) =>
      clawd.callTool(
        a.name as string,
        (a.args as Record<string, unknown> | undefined) ?? {},
        (a.surface as ClawdSurface | undefined) ?? 'gateway',
      ),
  });
  add({ name: 'clawd_list_skills', description: 'List the Clawd skills catalogue (clawdcompute.us/skills).', inputSchema: NO_ARGS, handler: () => clawd.listSkills() });
  add({
    name: 'clawd_get_skill',
    description: 'Fetch one skill\'s SKILL.md from the Clawd catalogue by name.',
    inputSchema: obj({ name: S.str }, ['name']),
    handler: async (a) => ({ name: a.name, skill: await clawd.getSkill(a.name as string) }),
  });
  add({
    name: 'clawd_get_gateway_skill',
    description: 'Fetch the Clawd gateway\'s served SKILL.md (clawdcompute.us/SKILL.md).',
    inputSchema: NO_ARGS,
    handler: async () => ({ skill: await clawd.getGatewaySkill() }),
  });

  // ── DFlow / Birdeye — hosted MCP passthrough ────────────────────────────
  add({ name: 'dflow_list_tools', description: 'List tools on the hosted DFlow MCP server.', inputSchema: NO_ARGS, handler: () => dflow.listTools() });
  add({
    name: 'dflow_call_tool',
    description: 'Call a tool on the hosted DFlow MCP server by name.',
    inputSchema: obj({ name: S.str, args: S.anyObj }, ['name']),
    handler: (a) => dflow.callTool(a.name as string, (a.args as Record<string, unknown> | undefined) ?? {}),
  });
  add({ name: 'birdeye_list_tools', description: 'List tools on the hosted Birdeye MCP server.', inputSchema: NO_ARGS, handler: () => birdeye.listTools() });
  add({
    name: 'birdeye_call_tool',
    description: 'Call a tool on the hosted Birdeye MCP server by name.',
    inputSchema: obj({ name: S.str, args: S.anyObj }, ['name']),
    handler: (a) => birdeye.callTool(a.name as string, (a.args as Record<string, unknown> | undefined) ?? {}),
  });

  // ── apply gates ─────────────────────────────────────────────────────────
  const gateOn: Record<ToolGate, boolean> = {
    imperialTrading: gates.imperialAllowTrading === true,
    jupiterTrading: gates.jupiterAllowTrading === true,
    raydiumBroadcast: gates.raydiumAllowBroadcast === true,
    heliusBroadcast: gates.heliusAllowBroadcast === true,
    pinata: gates.pinataConfigured === true,
  };
  return tools.filter((t) => !t.gate || gateOn[t.gate]);
}

/** Gate options from explicit overrides first, then the environment. */
export function gateOptionsFromEnv(overrides: ConnectorsOptions = {}): ToolGateOptions {
  const env = getEnvConfig();
  return {
    imperialAllowTrading: overrides.imperialAllowTrading ?? env.imperialAllowTrading,
    jupiterAllowTrading: overrides.jupiterAllowTrading ?? env.jupiterAllowTrading,
    raydiumAllowBroadcast: overrides.raydiumAllowBroadcast ?? env.raydiumAllowBroadcast,
    heliusAllowBroadcast: overrides.heliusAllowBroadcast ?? env.heliusAllowBroadcast,
    pinataConfigured: !!(overrides.pinataJwt ?? env.pinataJwt),
  };
}

/** Build the registry the MCP server serves: providers + env/opt-in gates. */
export function createToolRegistry(overrides: ConnectorsOptions = {}): ServerToolDef[] {
  return buildToolRegistry(createConnectors(overrides), gateOptionsFromEnv(overrides));
}
