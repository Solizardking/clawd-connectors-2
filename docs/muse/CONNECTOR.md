# Clawd Connectors

- `custom.clawd-connectors` connects Muse to the **Clawd Connectors** package
  (repo: `Solizardking/clawd-connectors-2`, site:
  https://connector.clawdcompute.us). The package ships provider connectors
  for Backpack, Imperial, Phoenix, Raydium, Metaplex, Sunrise, Helius,
  Jupiter, Birdeye and DFlow, plus the **Clawd connector** that fronts the
  whole Clawd Compute surface (gateway 272 tools, equities 22, seven
  read-only board MCPs, the skills catalogue).
- For agent use it ships its own **MCP server**, `clawd-connectors-mcp`
  (stdio by default, streamable HTTP with `--http`): **76 read tools by
  default** — market data, DAS reads, quotes, unsigned transaction
  builds, Clawd surface/skills meta-tools, DFlow/Birdeye passthroughs.
- No hosted credential registration is involved: the server runs locally
  and reads the user's own API keys from **environment variables only**.

## Install + run

```bash
git clone https://github.com/Solizardking/clawd-connectors-2.git
cd clawd-connectors-2
npm install
npm run build
cp .env.example .env   # optional; keyless providers work with an empty .env
node dist/mcp/server.js            # stdio MCP server
node dist/mcp/server.js --http     # streamable HTTP on :8931
```

The package is **not published to npm yet** (checked 2026-11-27) — do not
try to `npx @openclawd/clawd-connectors` from the registry; run it from
the clone. Register it in an MCP client with the generic config in the
repo's `examples/generic-mcp.json`, or read `docs/clients.md` in the repo
for per-client setup (Claude Desktop/Code, ChatGPT, Grok bots, Codex,
Cursor).

Hosted alternative (no install): the Clawd Compute gateway itself is an
MCP server at `https://mcp.clawdcompute.us/mcp` — that surface is covered
by the separate `custom.clawdcompute` connector doc.

## Credentials

- Env var NAMES only (values live in the user's `.env` / process env,
  never in this doc, the repo, or logs):
  `DFLOW_API_KEY`, `HELIUS_API_KEY`, `JUPITER_API_KEY`, `BIRDEYE_API_KEY`,
  `IMPERIAL_JWT`, `PINATA_JWT`, `SOLANA_RPC_URL`, `HELIUS_RPC_URL`.
- Opt-in flags (all default OFF): `IMPERIAL_ALLOW_TRADING`,
  `JUPITER_ALLOW_TRADING`, `RAYDIUM_ALLOW_BROADCAST`,
  `HELIUS_ALLOW_BROADCAST` (accept `1`/`true`).
- Never ask the user to paste a key into chat for this connector; if a
  key is missing, name the env var and let them set it locally.

## Safety

- **Fail-closed by default.** The 8 value-moving tools (Imperial
  place/cancel/deposit-build, Jupiter swap execute, Raydium broadcast,
  Helius Sender submit, Metaplex Pinata pinning) are not even registered
  unless the matching opt-in/credential is present, and the providers
  re-check their own gates.
- Builders return **unsigned** transactions; the user's own wallet
  signs. The server embeds no wallet and **never pays** x402 challenges —
  payable Clawd gateway calls surface the 402 challenge as a tool error.
- Backpack is read-only in this package (no ED25519 seed is ever
  accepted). Phoenix live trading stays in the user's Vulcan flow.

## Calling tools

Through any MCP client once registered. Tool names are prefixed by
provider: `backpack_*`, `phoenix_*`, `sunrise_*`, `raydium_*`,
`imperial_*`, `helius_*`, `jupiter_*`, `metaplex_*`, `clawd_*`
(surface/skills meta-tools), `dflow_*`, `birdeye_*`, plus
`connectors_status`. Start with `connectors_status` or
`clawd_surfaces` to see what is live, and `backpack_ticker`
(`{"symbol":"SOL_USDC"}`) for a keyless smoke call.

CLI equivalents from the clone: `npx clawd-connectors doctor`,
`npx clawd-connectors list-tools <provider>`,
`npx clawd-connectors clawd-surfaces`.
