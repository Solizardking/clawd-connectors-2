/**
 * Clawd Connectors — tests for the expanded provider set
 * (Backpack, Imperial, Phoenix, Raydium, Metaplex, Sunrise, Clawd)
 * plus the upgraded Helius/Jupiter wiring and the x402 payment hook.
 *
 * Unit tests stub global fetch — no network. Live smoke tests run only
 * when CLAWD_CONNECTORS_LIVE=1.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createConnectors,
  BackpackConnector,
  backpackSigningString,
  ImperialConnector,
  PhoenixConnector,
  RaydiumConnector,
  MetaplexConnector,
  SunriseConnector,
  ClawdComputeConnector,
  HeliusConnector,
  JupiterConnector,
  withPaymentHandling,
  PaymentRequiredError,
} from '../src/index.js';

const LIVE = process.env.CLAWD_CONNECTORS_LIVE === '1';

// ── fetch stubbing ────────────────────────────────────────────────────────
type FetchCall = { url: string; init?: RequestInit };
let calls: FetchCall[] = [];
let realFetch: typeof fetch;

function stubFetch(handler: (url: string, init?: RequestInit) => unknown) {
  calls = [];
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const body = handler(url, init);
    return new Response(JSON.stringify(body), {
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

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

describe('factory — expanded set', () => {
  it('creates all eleven providers with correct ids', () => {
    const c = createConnectors({});
    const ids = Object.values(c).map((x) => x.id).sort();
    assert.deepEqual(ids, [
      'backpack', 'birdeye', 'clawd', 'dflow', 'helius', 'imperial',
      'jupiter', 'metaplex', 'phoenix', 'raydium', 'sunrise',
    ]);
    assert.ok(c.backpack instanceof BackpackConnector);
    assert.ok(c.imperial instanceof ImperialConnector);
    assert.ok(c.phoenix instanceof PhoenixConnector);
    assert.ok(c.raydium instanceof RaydiumConnector);
    assert.ok(c.metaplex instanceof MetaplexConnector);
    assert.ok(c.sunrise instanceof SunriseConnector);
    assert.ok(c.clawd instanceof ClawdComputeConnector);
  });
});

describe('backpack', () => {
  it('signing string matches the documented canonical example', () => {
    const s = backpackSigningString(
      'orderCancel',
      { symbol: 'BTC_USDT', orderId: 28 },
      1614550000000,
      5000,
    );
    assert.equal(
      s,
      'instruction=orderCancel&orderId=28&symbol=BTC_USDT&timestamp=1614550000000&window=5000',
    );
  });

  it('ticker hits the public endpoint with the symbol', async () => {
    stubFetch(() => ({ symbol: 'SOL_USDC', lastPrice: '150.1' }));
    const bp = new BackpackConnector({});
    const t = await bp.ticker<{ lastPrice: string }>('SOL_USDC');
    assert.equal(t.lastPrice, '150.1');
    assert.ok(calls[0].url.startsWith('https://api.backpack.exchange/api/v1/ticker?symbol=SOL_USDC'));
  });

  it('klines sends seconds-based times', async () => {
    stubFetch(() => []);
    const bp = new BackpackConnector({});
    await bp.klines({ symbol: 'SOL_USDC', interval: '1h', startTime: 1700000000, endTime: 1700086400 });
    assert.ok(calls[0].url.includes('startTime=1700000000'));
    assert.ok(calls[0].url.includes('interval=1h'));
  });
});

describe('phoenix', () => {
  it('mark price + orderbook URLs', async () => {
    stubFetch(() => ({ markPrice: '150' }));
    const ph = new PhoenixConnector({});
    await ph.markPrice('SOL-PERP');
    assert.equal(calls[0].url, 'https://perp-api.phoenix.trade/v1/market/SOL-PERP/mark-price');
    await ph.orderbook('SOL-PERP');
    assert.equal(calls[1].url, 'https://perp-api.phoenix.trade/v1/view/orderbook/SOL-PERP');
  });
});

describe('sunrise', () => {
  it('snapshot parses and asset lookup is case-insensitive', async () => {
    stubFetch(() => ({
      ok: true,
      generatedAt: new Date().toISOString(),
      universe: 'sunrise-only',
      assets: [{ symbol: 'AAPL', price: 358.28 }, { symbol: 'TSLA', price: 400 }],
    }));
    const sun = new SunriseConnector({});
    const snap = await sun.snapshot();
    assert.equal(snap.assets.length, 2);
    assert.ok(snap.stalenessSeconds < 60);
    const a = await sun.asset('aapl');
    assert.equal(a?.price, 358.28);
  });
});

describe('imperial', () => {
  const order = {
    wallet: 'Wallet111', profileIndex: 0, underwriter: 2, side: 0 as const,
    action: 0 as const, orderType: 0, fundingStatus: 0, priority: 0,
    collateralAmount: 10000000, sizeUsd: 100000000, slippageBps: 50,
    triggerPrice: 0, triggerCondition: 0 as const, symbol: 'SOL',
  };

  it('public reads need no auth', async () => {
    stubFetch(() => ({ SOL: { markPrice: 150 } }));
    const im = new ImperialConnector({});
    await im.markPrices();
    assert.equal(calls[0].url, 'https://api.imperial.space/api/v1/mark-prices');
    assert.equal((calls[0].init?.headers as Record<string, string>)?.Authorization, undefined);
  });

  it('placeOrder is fail-closed without allowTrading', async () => {
    const im = new ImperialConnector({ jwt: 'test-jwt' });
    await assert.rejects(() => im.placeOrder(order), /fail-closed/);
  });

  it('placeOrder requires a JWT even with trading enabled', async () => {
    const im = new ImperialConnector({ allowTrading: true });
    await assert.rejects(() => im.placeOrder(order), /JWT not configured/);
  });

  it('placeOrder passes the 200-with-success=false body through untouched', async () => {
    stubFetch(() => ({ success: false, error: 'InsufficientBalance', errorCode: 'X' }));
    const im = new ImperialConnector({ jwt: 'test-jwt', allowTrading: true });
    const res = await im.placeOrder<{ success: boolean; error: string }>(order);
    assert.equal(res.success, false);
    assert.equal(res.error, 'InsufficientBalance');
    const headers = calls[0].init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer test-jwt');
  });

  it('balances requires a JWT', async () => {
    const im = new ImperialConnector({});
    await assert.rejects(() => im.balances(), /JWT not configured/);
  });
});

describe('raydium', () => {
  it('quote parses the compute response', async () => {
    stubFetch(() => ({
      success: true,
      data: { outputAmount: '14900000', otherAmountThreshold: '14800000', priceImpactPct: 0.1 },
    }));
    const r = new RaydiumConnector({});
    const q = await r.quote({ inputMint: SOL, outputMint: USDC, amount: 100000000 });
    assert.equal(q.outputAmount, '14900000');
    assert.ok(calls[0].url.includes('/compute/swap-base-in'));
  });

  it('buildSwap returns the unsigned transaction', async () => {
    stubFetch((url) =>
      url.includes('/transaction/')
        ? { success: true, data: { tx: { transaction: 'BASE64UNSIGNED' }, swapResponse: { outputAmount: '1' } } }
        : { success: true, data: {} },
    );
    const r = new RaydiumConnector({});
    const built = await r.buildSwap({ inputMint: SOL, outputMint: USDC, amount: 1000, wallet: 'Wallet111' });
    assert.equal(built.unsignedTx, 'BASE64UNSIGNED');
    assert.ok(calls[0].url.includes('wallet=Wallet111'));
  });

  it('broadcast is fail-closed by default', async () => {
    const r = new RaydiumConnector({});
    await assert.rejects(() => r.broadcast('AAAA'), /fail-closed/);
  });
});

describe('jupiter (upgraded)', () => {
  it('swapOrder hits Swap V2 /order with the x-api-key header', async () => {
    stubFetch(() => ({ transaction: 'BASE64', requestId: 'req-1', outAmount: '42' }));
    const j = new JupiterConnector({ apiKey: 'test-jup' });
    const o = await j.swapOrder({ inputMint: SOL, outputMint: USDC, amount: 1000, taker: 'Wallet111' });
    assert.equal(o.requestId, 'req-1');
    assert.ok(calls[0].url.startsWith('https://api.jup.ag/swap/v2/order?'));
    assert.ok(calls[0].url.includes('taker=Wallet111'));
    const headers = calls[0].init?.headers as Record<string, string>;
    assert.equal(headers['x-api-key'], 'test-jup');
  });

  it('swapExecute is fail-closed without allowTrading', async () => {
    const j = new JupiterConnector({ apiKey: 'test-jup' });
    await assert.rejects(
      () => j.swapExecute({ signedTransaction: 'AAAA', requestId: 'req-1' }),
      /fail-closed/,
    );
  });

  it('quote without a taker explains the V2 requirement', async () => {
    const j = new JupiterConnector({ apiKey: 'test-jup' });
    await assert.rejects(
      () => j.quote({ inputMint: SOL, outputMint: USDC, amount: 1 }),
      /requires a taker/,
    );
  });
});

describe('helius (upgraded)', () => {
  it('rpc endpoint follows the network + key shape', () => {
    const h = new HeliusConnector({ apiKey: 'test-key' });
    assert.equal(h.rpcEndpoint(), 'https://mainnet.helius-rpc.com/?api-key=test-key');
    const hd = new HeliusConnector({ apiKey: 'test-key', network: 'devnet' });
    assert.equal(hd.rpcEndpoint(), 'https://devnet.helius-rpc.com/?api-key=test-key');
  });

  it('getAsset posts a DAS call to the RPC endpoint', async () => {
    stubFetch(() => ({ result: { id: 'Asset1', content: { metadata: { name: 'X' } } } }));
    const h = new HeliusConnector({ apiKey: 'test-key' });
    const a = await h.getAsset<{ id: string }>('Asset1');
    assert.equal(a.id, 'Asset1');
    const body = JSON.parse(String(calls[0].init?.body));
    assert.equal(body.method, 'getAsset');
  });

  it('senderSubmit is fail-closed without allowBroadcast', async () => {
    const h = new HeliusConnector({ apiKey: 'test-key' });
    await assert.rejects(() => h.senderSubmit('AAAA'), /fail-closed/);
  });
});

describe('metaplex', () => {
  it('pinJson refuses without PINATA_JWT', async () => {
    const m = new MetaplexConnector({});
    await assert.rejects(() => m.pinJson('x', { name: 'x' }), /PINATA_JWT not configured/);
  });

  it('pinJson returns the ipfs:// URI', async () => {
    stubFetch(() => ({ IpfsHash: 'bafy123' }));
    const m = new MetaplexConnector({ pinataJwt: 'test-jwt' });
    const pinned = await m.pinJson('meta', { name: 'Agent' });
    assert.equal(pinned.uri, 'ipfs://bafy123');
    const headers = calls[0].init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer test-jwt');
  });

  it('getAsset posts DAS to the configured RPC', async () => {
    stubFetch(() => ({ result: { id: 'A1', interface: 'MplCoreAsset' } }));
    const m = new MetaplexConnector({ rpcUrl: 'https://rpc.example/?api-key=x' });
    const a = await m.getAsset<{ interface: string }>('A1');
    assert.equal(a.interface, 'MplCoreAsset');
    assert.equal(calls[0].url, 'https://rpc.example/?api-key=x');
  });

  it('buildCreateAssetTx names the optional packages when absent', async () => {
    const m = new MetaplexConnector({});
    await assert.rejects(
      () => m.buildCreateAssetTx({ name: 'X', uri: 'ipfs://bafy', owner: 'Wallet111' }),
      /optional Metaplex Umi packages/,
    );
  });
});

describe('clawd connector', () => {
  it('surface registry covers gateway + equities + 7 boards', () => {
    const clawd = new ClawdComputeConnector({});
    const surfaces = clawd.surfaces();
    assert.equal(surfaces.length, 9);
    const names = surfaces.map((s) => s.surface).sort();
    assert.deepEqual(names, [
      'bubbles', 'decide', 'equities', 'gateway', 'heat', 'map', 'monitor', 'perps', 'sun',
    ]);
    const gw = surfaces.find((s) => s.surface === 'gateway');
    assert.equal(gw?.mcpUrl, 'https://mcp.clawdcompute.us/mcp');
    assert.equal(gw?.probedToolCount, 272);
    assert.equal(clawd.gatewayAltUrl(), 'https://clawdcompute.us/mcp');
    const eq = surfaces.find((s) => s.surface === 'equities');
    assert.equal(eq?.probedToolCount, 22);
  });
});

describe('x402 payment handling', () => {
  const challengeBody = JSON.stringify({
    x402Version: 1,
    accepts: [{ scheme: 'exact', network: 'solana', maxAmountRequired: '10000' }],
  });

  function fakeFetch402Then200(seen: Record<string, unknown>) {
    let n = 0;
    return (async (input: unknown, init?: RequestInit) => {
      n += 1;
      if (n === 1) {
        return new Response(challengeBody, {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      seen.headers = init?.headers;
      seen.calls = n;
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
  }

  it('throws PaymentRequiredError with the parsed challenge when no handler', async () => {
    const wrapped = withPaymentHandling(
      (async () =>
        new Response(challengeBody, {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        })) as typeof fetch,
      undefined,
      'clawd',
    );
    await assert.rejects(
      () => wrapped('https://example.invalid/mcp', { method: 'POST' }),
      (err: unknown) => {
        assert.ok(err instanceof PaymentRequiredError);
        assert.equal((err as PaymentRequiredError).challenge.json?.x402Version, 1);
        return true;
      },
    );
  });

  it('retries once with handler headers when a handler pays', async () => {
    const seen: Record<string, unknown> = {};
    const wrapped = withPaymentHandling(fakeFetch402Then200(seen), async (challenge) => {
      assert.equal(challenge.status, 402);
      return { 'X-PAYMENT': 'signed-payload' };
    }, 'clawd');
    const res = await wrapped('https://example.invalid/mcp', { method: 'POST', headers: {} });
    assert.equal(res.status, 200);
    assert.equal(seen.calls, 2);
    const headers = seen.headers as Headers;
    assert.equal(headers.get('X-PAYMENT'), 'signed-payload');
  });

  it('handler returning null still refuses to pay', async () => {
    const wrapped = withPaymentHandling(
      fakeFetch402Then200({}),
      async () => null,
      'clawd',
    );
    await assert.rejects(
      () => wrapped('https://example.invalid/mcp', { method: 'POST' }),
      PaymentRequiredError,
    );
  });
});

// ── Live smoke (CLAWD_CONNECTORS_LIVE=1) ──────────────────────────────────
describe('live smoke', { skip: !LIVE }, () => {
  it('backpack public status answers', async () => {
    const bp = new BackpackConnector({});
    const s = await bp.exchangeStatus<{ status?: string }>();
    assert.ok(s !== null && typeof s === 'object');
  });

  it('raydium quote SOL->USDC answers', async () => {
    const r = new RaydiumConnector({});
    const q = await r.quote({ inputMint: SOL, outputMint: USDC, amount: 100000000 });
    assert.ok(Number(q.outputAmount) > 0);
  });

  it('clawd gateway + equities + boards list tools', async () => {
    const clawd = new ClawdComputeConnector({});
    const gw = await clawd.listTools('gateway');
    assert.ok(gw.length > 200, `gateway tools: ${gw.length}`);
    const eq = await clawd.listTools('equities');
    assert.equal(eq.length, 22);
    for (const board of ['decide', 'perps', 'map', 'bubbles', 'monitor', 'heat', 'sun'] as const) {
      const tools = await clawd.listTools(board);
      assert.ok(tools.length > 0, `${board} tools: ${tools.length}`);
    }
    await clawd.close();
  });

  it('sunrise snapshot + skills catalogue answer', async () => {
    const sun = new SunriseConnector({});
    const snap = await sun.snapshot();
    assert.ok(snap.assets.length > 50, `sunrise assets: ${snap.assets.length}`);
    const clawd = new ClawdComputeConnector({});
    const skills = await clawd.listSkills();
    assert.ok(skills.length > 100, `skills: ${skills.length}`);
    const md = await clawd.getGatewaySkill();
    assert.ok(md.includes('clawd'));
  });
});
