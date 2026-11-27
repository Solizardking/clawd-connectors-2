# 🦞 Clawd Connectors

**MCP-powered provider connectors for Clawd** — DFlow, Helius, Jupiter, Birdeye,
Backpack, Imperial, Phoenix, Raydium, Metaplex, Sunrise, and **Clawd**: the
entire Clawd Compute surface wrapped into one connector.

## Safety model (read this first)

- **Keys come from env only** — see `.env.example`. Nothing is embedded,
  logged, or committed.
- **Trading is fail-closed.** Order placement (Imperial), swap execution
  (Jupiter), and broadcasting signed transactions (Raydium, Helius Sender)
  refuse unless you explicitly opt in (`IMPERIAL_ALLOW_TRADING=1`,
  `JUPITER_ALLOW_TRADING=1`, `RAYDIUM_ALLOW_BROADCAST=1`,
  `HELIUS_ALLOW_BROADCAST=1`). Builders return **unsigned** transactions —
  the user's own wallet always signs.
- **No autonomous payments.** Clawd gateway tools are x402 pay-per-call;
  without a `PaymentHandler` you supply, payable calls throw
  `PaymentRequiredError` with the server's challenge attached.
- **Backpack is read-only** — authenticated trading is not enabled; no
  ED25519 seed is ever accepted or stored.

## Quickstart

```bash
npm install
npm run build
npm test                          # hermetic unit tests
CLAWD_CONNECTORS_LIVE=1 npm test  # + live smoke against public endpoints
npx clawd-connectors doctor       # config + per-provider status
npx clawd-connectors clawd-surfaces
```

```ts
import { createConnectors } from "@openclawd/clawd-connectors";

const c = createConnectors(); // reads env (see .env.example)

// Keyless reads
const ticker = await c.backpack.ticker("SOL_USDC");
const markets = await c.phoenix.markets();
const quote = await c.raydium.quote({ inputMint: SOL, outputMint: USDC, amount: 100_000_000 });
const snap = await c.sunrise.snapshot(); // carries generatedAt + stalenessSeconds

// Helius DAS + Jupiter data (keys from env)
const assets = await c.helius.getAssetsByOwner({ ownerAddress: wallet });
const tokens = await c.jupiter.searchTokens("clawd");

// The whole of Clawd Compute through one connector
const gatewayTools = await c.clawd.listTools("gateway");   // 272 tools
const boardTools = await c.clawd.listTools("bubbles");     // board surfaces too
const skills = await c.clawd.listSkills();                 // skills catalogue
```

## The Clawd connector

One provider (`connectors.clawd`) fronts every Clawd Compute surface —
live-probed 2026-11-27:

| Surface | MCP URL | Tools |
|---------|---------|-------|
| gateway | `https://mcp.clawdcompute.us/mcp` (alt host `https://clawdcompute.us/mcp`) | **272** |
| equities | `https://mcp.equities.clawdcompute.us/mcp` | **22** |
| decide | `https://decide.clawdcompute.us/mcp` | 3 |
| perps | `https://perps.clawdcompute.us/mcp` | 2 |
| map | `https://map.clawdcompute.us/mcp` | 3 |
| bubbles | `https://bubbles.clawdcompute.us/mcp` | 3 |
| monitor | `https://monitor.clawdcompute.us/mcp` | 3 |
| heat | `https://heat.clawdcompute.us/mcp` | 2 |
| sun | `https://sun.clawdcompute.us/mcp` | 3 |

Plus the **skills catalogue** (`listSkills()` / `getSkill(name)` over the
Solizardking/skills repo behind clawdcompute.us/skills, 600+ skills) and the
gateway's served `SKILL.md` (`getGatewaySkill()`).

Paying for gateway tools is your app's explicit choice:

```ts
const c = createConnectors({
  clawdPaymentHandler: async (challenge) => {
    // inspect challenge.json, decide, and return signed payment headers —
    // or return null to refuse. Default (no handler): calls throw
    // PaymentRequiredError. This package never pays on its own.
    return null;
  },
});
```

## Providers

| Provider | Auth env | Surface |
|----------|----------|---------|
| **DFlow** | `DFLOW_API_KEY` | MCP `https://api.paybox.sh/mcp?app=dflow` · REST `https://api.dflow.net` |
| **Helius** | `HELIUS_API_KEY` | MCP `https://api.helius.dev/mcp` · RPC/DAS `https://mainnet.helius-rpc.com` · REST `https://api.helius.dev/v0` · Sender (gated) |
| **Jupiter** | `JUPITER_API_KEY` (`x-api-key`) | MCP `https://api.jup.ag/mcp` · REST `https://api.jup.ag` — Swap V2, Shield, Tokens v2, Price v3, Trigger v2, Recurring v1 |
| **Birdeye** | `BIRDEYE_API_KEY` | MCP + REST `https://public-api.birdeye.so` |
| **Backpack** | — (keyless) | Public market data `https://api.backpack.exchange` — read-only; signing-string reference only |
| **Imperial** | `IMPERIAL_JWT` (reads/trading) | `https://api.imperial.space/api/v1` — public reads keyless; orders fail-closed behind `IMPERIAL_ALLOW_TRADING=1` |
| **Phoenix** | — (keyless) | Phoenix Eternal public API `https://perp-api.phoenix.trade` — read-only market data |
| **Raydium** | — (keyless) | Trade API quote + unsigned swap builds; broadcast gated behind `RAYDIUM_ALLOW_BROADCAST=1` |
| **Metaplex** | `SOLANA_RPC_URL` (DAS), `PINATA_JWT` (pinning) | DAS reads, Pinata IPFS pinning, MPL Core create-asset builder (optional Umi peers; user wallet signs) |
| **Sunrise** | — (keyless) | Snapshot `https://sun.clawdcompute.us/api/sunrise` with staleness reporting |
| **Clawd** | — (x402 per call) | All of Clawd Compute — see above |

Notes:

- **Jupiter Lend** is SDK-based (`@jup-ag/lend-read` / `@jup-ag/lend`) and is
  reachable through the Jupiter MCP server; it has no REST surface here.
  **Jupiter Perps** has no REST API at all (on-chain only).
- **Imperial** returns HTTP 200 even on order rejection — always inspect
  `success` / `error` / `errorCode` in the result body.
- **Metaplex** `buildCreateAssetTx()` needs the optional Umi packages
  (`@metaplex-foundation/umi`, `umi-bundle-defaults`, `mpl-core`) and is the
  one path not runtime-verified in this repo; reads and pinning are
  self-contained.

## CLI

```bash
clawd-connectors status                       # keys, opt-in flags, per-provider status
clawd-connectors list-tools clawd --surface equities
clawd-connectors list-tools helius
clawd-connectors clawd-surfaces               # every Clawd surface + skills count
clawd-connectors subscriptions list           # Pay subscriptions helper
```

## `.mcp.json`

Drop-in MCP registration for Claude Code / compatible clients is included at
the repo root (gateway, equities, boards, and the hosted provider MCPs).

## Development

```bash
npm install
npm run build   # tsc -> dist/ (tracked, per repo pattern)
npm test
```
