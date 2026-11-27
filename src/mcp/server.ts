#!/usr/bin/env node
/**
 * Clawd Connectors — MCP server (bin: clawd-connectors-mcp)
 *
 * Exposes the providers' READ tools (plus unsigned transaction builds)
 * over MCP so any MCP client — Claude Desktop, Claude Code, ChatGPT
 * (via a public URL), Grok bots, Muse — can use the connector set with
 * one command:
 *
 *   clawd-connectors-mcp            # stdio (default)
 *   clawd-connectors-mcp --http     # streamable HTTP on :8931
 *
 * Env:
 *   CLAWD_CONNECTORS_MCP_TRANSPORT  stdio | http (default stdio)
 *   CLAWD_CONNECTORS_MCP_PORT       HTTP port (default 8931; PORT also read)
 *   + every provider env var from .env.example. Value-moving tools are
 *     registered ONLY behind the same opt-in flags the providers use
 *     (IMPERIAL_ALLOW_TRADING, JUPITER_ALLOW_TRADING,
 *      RAYDIUM_ALLOW_BROADCAST, HELIUS_ALLOW_BROADCAST) — see
 *     src/mcp/tools.ts. This server never embeds a wallet and never pays
 *     x402 challenges.
 */
import { createServer as createHttpServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createToolRegistry, type ServerToolDef } from './tools.js';

export const SERVER_NAME = 'clawd-connectors';
export const SERVER_VERSION = '0.3.0';

/** Build an MCP Server serving the given tool registry. */
export function createConnectorsMcpServer(tools: ServerToolDef[]): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as { type: 'object'; [key: string]: unknown },
      annotations: t.gate
        ? { readOnlyHint: false, destructiveHint: true }
        : { readOnlyHint: true, destructiveHint: false },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Error: unknown tool ${request.params.name}` }],
        isError: true,
      };
    }
    try {
      const result = await tool.handler(
        (request.params.arguments ?? {}) as Record<string, unknown>,
      );
      const text =
        typeof result === 'string' ? result : JSON.stringify(result ?? null, null, 2);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  });

  return server;
}

async function main(): Promise<void> {
  const tools = createToolRegistry();
  const useHttp =
    process.argv.includes('--http') ||
    process.env.CLAWD_CONNECTORS_MCP_TRANSPORT === 'http';

  if (!useHttp) {
    const server = createConnectorsMcpServer(tools);
    await server.connect(new StdioServerTransport());
    console.error(
      `${SERVER_NAME} MCP server v${SERVER_VERSION} (stdio) — ${tools.length} tools registered`,
    );
    return;
  }

  const port = parseInt(
    process.env.CLAWD_CONNECTORS_MCP_PORT || process.env.PORT || '8931',
    10,
  );
  const httpServer = createHttpServer(async (req, res) => {
    if (req.method === 'GET' && (req.url === '/healthz' || req.url === '/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, server: SERVER_NAME, version: SERVER_VERSION, tools: tools.length }));
      return;
    }
    // Stateless streamable HTTP: a fresh server+transport per request.
    const server = createConnectorsMcpServer(tools);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (err as Error).message }));
      }
    }
  });
  await new Promise<void>((r) => httpServer.listen(port, r));
  console.error(
    `${SERVER_NAME} MCP server v${SERVER_VERSION} (streamable HTTP) — ${tools.length} tools on http://127.0.0.1:${port}/`,
  );
}

const isMain =
  !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('clawd-connectors-mcp fatal:', (err as Error).message);
    process.exit(1);
  });
}
