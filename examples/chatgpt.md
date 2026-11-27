# Clawd Connectors in ChatGPT

ChatGPT connects to **remote** MCP servers over public HTTPS — it cannot
launch a local stdio server. So in ChatGPT you use the **hosted** Clawd
Compute gateway. (For the full local provider set — your own API keys,
keyless Backpack/Phoenix/Raydium reads — use Claude, Cursor, or another
stdio-capable client; see `docs/clients.md`.)

> State of ChatGPT support, checked 2026-11-27: custom MCP servers are
> added from **Plugins → Add custom MCP server** on ChatGPT **on the web**
> (the older "Developer mode" toggle under Settings → Apps & Connectors →
> Advanced settings is the legacy path to the same thing). The endpoint
> must be public HTTPS. ChatGPT offers **OAuth or no authentication** —
> there is no field for a fixed API key or custom header. Plan rules:
> Business / Enterprise / Edu get full read + write MCP; Pro is
> read/fetch; Plus carries Developer mode (beta) per OpenAI's pricing
> page. Tools without a `readOnlyHint` are treated as write actions and
> ask for confirmation — every read tool in this package sets it.

## Steps

1. Open ChatGPT on the web → **Plugins** → **Add** (＋) → **Add custom MCP server**.
2. Name: `Clawd Connectors`
3. Description: `Clawd Compute gateway — Solana market data, perps intel, equities, the agent registry and research boards.`
4. Connection URL: `https://mcp.clawdcompute.us/mcp`
5. Authentication: **OAuth** (the gateway's sign-in is Clawd Compute /
   Clerk OAuth; public-lane tools also answer without sign-in where the
   client permits "No authentication").
6. Tick **I understand and want to continue**, then **Create as a plugin**.
7. Install the plugin, open a new chat, and `@`-mention it.

First prompts to try:

- "Use Clawd Connectors: what's the Phoenix mark price for SOL-PERP?"
- "Use Clawd Connectors: show me the Clawd Compute gateway tool list."

## Notes

- **Trading is not available to ChatGPT through this connector.** The
  gateway refuses trading for agent sessions, and this package's trading
  tools exist only in the local server behind explicit env opt-ins.
- Gateway tools are pay-per-call via x402 ($0.01) unless free/gated;
  ChatGPT sessions settle through the gateway's own account flow, never
  through this package.
- A local server can be exposed to ChatGPT only through a public tunnel
  (e.g. OpenAI's Secure MCP Tunnel, or your own HTTPS tunnel to
  `clawd-connectors-mcp --http`). That is an advanced setup; the hosted
  gateway above is the supported path.
