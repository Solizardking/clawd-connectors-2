/**
 * Clawd Connectors — Remote MCP client
 * Connects to a remote MCP server URL (e.g. https://api.paybox.sh/mcp?app=dflow)
 * using the Model Context Protocol SDK Streamable HTTP transport.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
export class RemoteMcpClient {
    provider;
    mcpUrl;
    apiKey;
    client = null;
    transport = null;
    toolCache = null;
    constructor(options) {
        this.provider = options.provider;
        this.mcpUrl = options.mcpUrl;
        this.apiKey = options.apiKey;
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
        });
        this.client = new Client({ name: `clawd-connectors-${this.provider}`, version: '0.1.0' }, { capabilities: {} });
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