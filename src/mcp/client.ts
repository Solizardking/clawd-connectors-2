/**
 * Clawd Connectors — Remote MCP client
 * Connects to a remote MCP server URL (e.g. https://api.paybox.sh/mcp?app=dflow)
 * using the Model Context Protocol SDK Streamable HTTP transport.
 *
 * x402: when a request is answered HTTP 402, the fetch layer parses the
 * payment challenge and hands it to the configured PaymentHandler. If the
 * handler returns headers, the request is retried once with them; if there
 * is no handler (the default) a PaymentRequiredError is thrown — this
 * package never pays on its own.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  McpCallResult,
  McpToolDefinition,
  PaymentHandler,
  ProviderId,
  X402Challenge,
} from '../types.js';

/** Thrown when a call needs x402 payment but no payment handler is configured. */
export class PaymentRequiredError extends Error {
  readonly challenge: X402Challenge;
  constructor(provider: string, challenge: X402Challenge) {
    super(
      `${provider}: payment required (HTTP 402) but no payment handler is configured. ` +
        `Configure a PaymentHandler to pay x402 tools explicitly; this package never pays by default.`,
    );
    this.name = 'PaymentRequiredError';
    this.challenge = challenge;
  }
}

type FetchFn = typeof fetch;

/**
 * Wrap a fetch implementation with x402 challenge handling.
 * Exported for direct unit testing.
 */
export function withPaymentHandling(
  baseFetch: FetchFn,
  handler: PaymentHandler | undefined,
  provider: string,
): FetchFn {
  const wrapped = async (
    input: Parameters<FetchFn>[0],
    init?: Parameters<FetchFn>[1],
  ): Promise<Response> => {
    const res = await baseFetch(input, init);
    if (res.status !== 402) return res;

    const raw = await res
      .clone()
      .text()
      .catch(() => '');
    let json: Record<string, unknown> | undefined;
    try {
      json = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      json = undefined;
    }
    const challenge: X402Challenge = {
      raw,
      json,
      header: res.headers.get('payment-required') ?? undefined,
      status: 402,
    };

    if (!handler) {
      throw new PaymentRequiredError(provider, challenge);
    }
    const paymentHeaders = await handler(challenge);
    if (!paymentHeaders) {
      throw new PaymentRequiredError(provider, challenge);
    }
    const retryHeaders = new Headers(init?.headers);
    for (const [k, v] of Object.entries(paymentHeaders)) retryHeaders.set(k, v);
    return baseFetch(input, { ...init, headers: retryHeaders });
  };
  return wrapped as FetchFn;
}

export interface RemoteMcpClientOptions {
  provider: ProviderId;
  mcpUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  /** x402 payment hook; default none (payable calls throw PaymentRequiredError). */
  paymentHandler?: PaymentHandler;
}

export class RemoteMcpClient {
  private readonly provider: ProviderId;
  private readonly mcpUrl: string;
  private readonly apiKey?: string;
  private readonly paymentHandler?: PaymentHandler;
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private toolCache: McpToolDefinition[] | null = null;

  constructor(options: RemoteMcpClientOptions) {
    this.provider = options.provider;
    this.mcpUrl = options.mcpUrl;
    this.apiKey = options.apiKey;
    this.paymentHandler = options.paymentHandler;
  }

  async connect(): Promise<void> {
    if (this.client) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['X-API-Key'] = this.apiKey;
    }

    this.transport = new StreamableHTTPClientTransport(new URL(this.mcpUrl), {
      requestInit: { headers },
      fetch: withPaymentHandling(fetch, this.paymentHandler, this.provider),
    });

    this.client = new Client(
      { name: `clawd-connectors-${this.provider}`, version: '0.2.0' },
      { capabilities: {} },
    );

    await this.client.connect(this.transport);
  }

  async listTools(): Promise<McpToolDefinition[]> {
    await this.connect();
    if (this.toolCache) return this.toolCache;

    const result = await this.client!.listTools();
    this.toolCache = (result.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: (t.inputSchema ?? undefined) as Record<string, unknown> | undefined,
      annotations: (t.annotations ?? undefined) as Record<string, unknown> | undefined,
      meta: (t._meta ?? undefined) as Record<string, unknown> | undefined,
    }));
    return this.toolCache;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpCallResult> {
    await this.connect();
    const result = await this.client!.callTool({ name, arguments: args });
    return {
      content: (result.content ?? []) as McpCallResult['content'],
      isError: result.isError === true,
    };
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
      this.toolCache = null;
    }
  }
}

export function mcpUrlFor(provider: ProviderId): string {
  // If URL is not provided, fall back to the standard DFlow-style remote MCP pattern
  return provider === 'dflow' ? 'https://api.paybox.sh/mcp?app=dflow' : '';
}
