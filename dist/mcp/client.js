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
/** Thrown when a call needs x402 payment but no payment handler is configured. */
export class PaymentRequiredError extends Error {
    challenge;
    constructor(provider, challenge) {
        super(`${provider}: payment required (HTTP 402) but no payment handler is configured. ` +
            `Configure a PaymentHandler to pay x402 tools explicitly; this package never pays by default.`);
        this.name = 'PaymentRequiredError';
        this.challenge = challenge;
    }
}
/**
 * Wrap a fetch implementation with x402 challenge handling.
 * Exported for direct unit testing.
 */
export function withPaymentHandling(baseFetch, handler, provider) {
    const wrapped = async (input, init) => {
        const res = await baseFetch(input, init);
        if (res.status !== 402)
            return res;
        const raw = await res
            .clone()
            .text()
            .catch(() => '');
        let json;
        try {
            json = JSON.parse(raw);
        }
        catch {
            json = undefined;
        }
        const challenge = {
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
        for (const [k, v] of Object.entries(paymentHeaders))
            retryHeaders.set(k, v);
        return baseFetch(input, { ...init, headers: retryHeaders });
    };
    return wrapped;
}
export class RemoteMcpClient {
    provider;
    mcpUrl;
    apiKey;
    paymentHandler;
    client = null;
    transport = null;
    toolCache = null;
    constructor(options) {
        this.provider = options.provider;
        this.mcpUrl = options.mcpUrl;
        this.apiKey = options.apiKey;
        this.paymentHandler = options.paymentHandler;
    }
    async connect() {
        if (this.client)
            return;
        const headers = {
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
        this.client = new Client({ name: `clawd-connectors-${this.provider}`, version: '0.2.0' }, { capabilities: {} });
        await this.client.connect(this.transport);
    }
    async listTools() {
        await this.connect();
        if (this.toolCache)
            return this.toolCache;
        const result = await this.client.listTools();
        this.toolCache = (result.tools ?? []).map((t) => ({
            name: t.name,
            description: t.description ?? '',
            inputSchema: (t.inputSchema ?? undefined),
            annotations: (t.annotations ?? undefined),
            meta: (t._meta ?? undefined),
        }));
        return this.toolCache;
    }
    async callTool(name, args) {
        await this.connect();
        const result = await this.client.callTool({ name, arguments: args });
        return {
            content: (result.content ?? []),
            isError: result.isError === true,
        };
    }
    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.transport = null;
            this.toolCache = null;
        }
    }
}
export function mcpUrlFor(provider) {
    // If URL is not provided, fall back to the standard DFlow-style remote MCP pattern
    return provider === 'dflow' ? 'https://api.paybox.sh/mcp?app=dflow' : '';
}
//# sourceMappingURL=client.js.map