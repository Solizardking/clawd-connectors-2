/**
 * Clawd Connectors — MCP server registry tests
 *
 * The server (src/mcp/server.ts) serves the registry built by
 * src/mcp/tools.ts. These tests pin the exposure rules:
 * - read tools are always listed;
 * - value-moving tools are ABSENT by default and appear only behind
 *   their env opt-in flags;
 * - Metaplex pinning tools appear only when PINATA_JWT is configured;
 * - handlers actually reach the providers (fetch stubbed, no network).
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildToolRegistry,
  createConnectors,
  createToolRegistry,
} from '../src/index.js';

const GATED = [
  'imperial_place_order',
  'imperial_cancel_order',
  'imperial_build_deposit_tx',
  'jupiter_swap_execute',
  'raydium_broadcast',
  'helius_sender_submit',
  'metaplex_pin_json',
  'metaplex_pin_file',
];

const READS = [
  'connectors_status',
  'backpack_ticker',
  'backpack_markets',
  'phoenix_markets',
  'phoenix_mark_price',
  'sunrise_snapshot',
  'raydium_quote',
  'raydium_build_swap',
  'imperial_mark_prices',
  'imperial_positions',
  'imperial_balances', // JWT read — listed; fails cleanly without a JWT
  'helius_get_asset',
  'helius_balances',
  'jupiter_swap_order', // unsigned build — the taker signs
  'jupiter_prices',
  'metaplex_get_asset',
  'metaplex_build_create_asset_tx',
  'clawd_surfaces',
  'clawd_list_tools',
  'clawd_call_tool',
  'clawd_list_skills',
  'dflow_list_tools',
  'birdeye_list_tools',
];

describe('mcp registry — default (fail-closed)', () => {
  it('lists the read tools and none of the gated tools', () => {
    const names = createToolRegistry({}).map((t) => t.name);
    for (const name of READS) assert.ok(names.includes(name), `missing read tool ${name}`);
    for (const name of GATED) assert.ok(!names.includes(name), `gated tool leaked: ${name}`);
    assert.equal(new Set(names).size, names.length, 'tool names must be unique');
  });

  it('read set is the full provider surface (>= 70 tools)', () => {
    const tools = createToolRegistry({});
    assert.ok(tools.length >= 70, `expected >= 70 read tools, got ${tools.length}`);
  });
});

describe('mcp registry — opt-in gates', () => {
  it('trading/broadcast tools appear only with their flag', () => {
    const connectors = createConnectors({});
    const on = buildToolRegistry(connectors, {
      imperialAllowTrading: true,
      jupiterAllowTrading: true,
      raydiumAllowBroadcast: true,
      heliusAllowBroadcast: true,
      pinataConfigured: true,
    }).map((t) => t.name);
    for (const name of GATED) assert.ok(on.includes(name), `gated tool missing when on: ${name}`);

    const imperialOnly = buildToolRegistry(connectors, { imperialAllowTrading: true }).map(
      (t) => t.name,
    );
    assert.ok(imperialOnly.includes('imperial_place_order'));
    assert.ok(!imperialOnly.includes('jupiter_swap_execute'));
    assert.ok(!imperialOnly.includes('raydium_broadcast'));
    assert.ok(!imperialOnly.includes('metaplex_pin_json'));
  });

  it('gated handlers still hit the provider gate (second lock)', async () => {
    // Registry gate open, provider gate closed (connector built without
    // allowTrading): the provider itself must refuse.
    const connectors = createConnectors({});
    const tools = buildToolRegistry(connectors, { imperialAllowTrading: true });
    const place = tools.find((t) => t.name === 'imperial_place_order');
    assert.ok(place);
    await assert.rejects(
      () => place.handler({ order: { wallet: 'w', profileIndex: 0 } }),
      /fail-closed|disabled/,
    );
  });
});

// ── handler wiring (fetch stubbed) ────────────────────────────────────────
type FetchCall = { url: string; init?: RequestInit };
let calls: FetchCall[] = [];
let realFetch: typeof fetch;

function stubFetch(handler: (url: string, init?: RequestInit) => unknown) {
  calls = [];
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return new Response(JSON.stringify(handler(url, init)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

beforeEach(() => {
  realFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('mcp registry — handlers reach providers', () => {
  it('backpack_ticker handler calls the Backpack API', async () => {
    stubFetch(() => ({ symbol: 'SOL_USDC', lastPrice: '150.0' }));
    const tools = createToolRegistry({});
    const ticker = tools.find((t) => t.name === 'backpack_ticker');
    assert.ok(ticker);
    const out = (await ticker.handler({ symbol: 'SOL_USDC' })) as { lastPrice: string };
    assert.equal(out.lastPrice, '150.0');
    assert.ok(calls[0].url.includes('api.backpack.exchange/api/v1/ticker'));
    assert.ok(calls[0].url.includes('symbol=SOL_USDC'));
  });

  it('raydium_quote handler returns the quote payload', async () => {
    stubFetch(() => ({ success: true, data: { outputAmount: '42' } }));
    const tools = createToolRegistry({});
    const quote = tools.find((t) => t.name === 'raydium_quote');
    assert.ok(quote);
    const out = (await quote.handler({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: 1000,
    })) as { outputAmount: string };
    assert.equal(out.outputAmount, '42');
  });

  it('imperial_balances handler fails cleanly without a JWT', async () => {
    stubFetch(() => ({}));
    const tools = createToolRegistry({});
    const balances = tools.find((t) => t.name === 'imperial_balances');
    assert.ok(balances);
    await assert.rejects(() => balances.handler({}), /IMPERIAL_JWT/);
  });

  it('clawd_surfaces handler is local (no network)', async () => {
    stubFetch(() => {
      throw new Error('network should not be touched');
    });
    const tools = createToolRegistry({});
    const surfaces = tools.find((t) => t.name === 'clawd_surfaces');
    assert.ok(surfaces);
    const out = (await surfaces.handler({})) as Array<{ surface: string }>;
    assert.ok(out.some((s) => s.surface === 'gateway'));
    assert.equal(calls.length, 0);
  });
});
