# Use Clawd Connectors with your agent

Clawd Connectors works in any MCP-capable client, two ways:

| Path | What you get | Install |
|------|--------------|---------|
| **Hosted** | The Clawd Compute gateway: 272 tools (market data, perps intel, equities, agent registry, research boards) at `https://mcp.clawdcompute.us/mcp` (alt host `https://clawdcompute.us/mcp`), plus the equities and board MCPs | None — point the client at the URL |
| **Local** | This package's own MCP server (`clawd-connectors-mcp`): **76 read tools by default** across Backpack, Imperial, Phoenix, Raydium, Metaplex, Sunrise, Helius, Jupiter, DFlow, Birdeye and the Clawd surfaces — with *your* API keys, on *your* machine | Clone + build (below) |

Trading, broadcasting and payments stay fail-closed on both paths — see
the [safety model](../README.md#safety-model-read-this-first).

## Local server quickstart

```bash
git clone https://github.com/Solizardking/clawd-connectors-2.git
cd clawd-connectors-2
npm install
npm run build
cp .env.example .env   # fill in only the keys you use; keyless providers need none
```

Run it:

```bash
npx clawd-connectors-mcp            # stdio (what MCP clients launch)
npx clawd-connectors-mcp --http     # streamable HTTP on :8931 (PORT / CLAWD_CONNECTORS_MCP_PORT)
```

The package is **not on npm yet** (checked 2026-11-27), so `npx` here
resolves the local `bin` after `npm install` in the clone (or use
`node dist/mcp/server.js` directly, as the example configs do). Once
published, the same configs work with
`npx -y --package=@openclawd/clawd-connectors clawd-connectors-mcp`.

Tool surface: 76 read tools by default (market data, DAS reads, quotes,
**unsigned** transaction builds — your wallet always signs). Setting the
opt-in flags in `.env` registers 8 more (84 total):
`IMPERIAL_ALLOW_TRADING=1` → Imperial place/cancel/deposit-build,
`JUPITER_ALLOW_TRADING=1` → Jupiter swap execute,
`RAYDIUM_ALLOW_BROADCAST=1` → Raydium broadcast,
`HELIUS_ALLOW_BROADCAST=1` → Helius Sender submit,
and `PINATA_JWT` → Metaplex IPFS pinning tools. The providers re-check
every gate themselves; the server never embeds a wallet and never pays
x402 challenges (payable gateway calls return the 402 challenge as an
error).

---

## Claude Desktop

**Local (full provider set):** merge
[`examples/claude-desktop.json`](../examples/claude-desktop.json) into
your `claude_desktop_config.json`, replacing `/ABSOLUTE/PATH` with your
clone path, and restart Desktop.

**Hosted (zero install):** Settings → Connectors → *Add custom
connector* → name `Clawd`, URL `https://mcp.clawdcompute.us/mcp`, sign in
with Clawd Compute when asked.

## Claude Code

Hosted, one line:

```bash
claude mcp add --transport http clawd-compute https://mcp.clawdcompute.us/mcp
```

Local, one line (after clone + build):

```bash
claude mcp add clawd-connectors -- node /ABSOLUTE/PATH/clawd-connectors-2/dist/mcp/server.js
```

…or drop [`examples/claude-code.mcp.json`](../examples/claude-code.mcp.json)
into your project as `.mcp.json` (the repo root also ships a ready
`.mcp.json` with the hosted surfaces).

## ChatGPT

ChatGPT takes **remote** MCP servers only — use the hosted gateway.
Full steps, plan notes and caveats (checked against OpenAI's docs on
2026-11-27): [`examples/chatgpt.md`](../examples/chatgpt.md).
Short version: chatgpt.com → **Plugins → Add custom MCP server** → name
`Clawd Connectors`, URL `https://mcp.clawdcompute.us/mcp`, auth **OAuth**.

## Grok / x.ai bots

Bots adopt the connector set from the Bot Connect manifest in
[`examples/connect.json`](../examples/connect.json) (fleet schema
`clawd-compute/bot-connect/v1`, also served at
<https://connector.clawdcompute.us/connect.json>): an `mcpServers` block
for the hosted gateway, the local-server entry, and a ready-to-paste
Grok bot prompt. Public-lane gateway tools need no key; bot/agent
sessions can never trade on the gateway.

## Muse

Muse agents adopt the package through the fleet connector doc in
[`docs/muse/`](./muse/) (`connector.yaml` + `CONNECTOR.md`): install,
the MCP server command, and the env var names. A Muse instance with the
repo cloned can also just read this file and the root `.mcp.json`.

## Any other MCP client

[`examples/generic-mcp.json`](../examples/generic-mcp.json) carries both
entries in the common `mcpServers` shape (hosted HTTP + local stdio) —
the same shape Cursor, Windsurf and Codex accept:

```bash
codex mcp add clawd-compute --url https://mcp.clawdcompute.us/mcp
```

## Which path should I pick?

- **Just want the tools now** → hosted gateway.
- **Want Backpack/Phoenix/Raydium reads with no account, DAS with your
  own Helius key, or Imperial reads with your own JWT** → local server.
- **Want trading tools to exist at all** → local server *and* your own
  explicit opt-in flags; hosted agent sessions can never trade.
