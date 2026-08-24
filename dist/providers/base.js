import { RemoteMcpClient } from '../mcp/client.js';
export class BaseConnector {
    id;
    config;
    mcp = null;
    constructor(config) {
        this.id = config.name;
        this.config = {
            timeoutMs: 15000,
            ...config,
        };
    }
    ensureMcp() {
        if (!this.config.mcpUrl) {
            throw new Error(`${this.id}: no MCP URL configured`);
        }
        if (!this.mcp) {
            this.mcp = new RemoteMcpClient({
                provider: this.id,
                mcpUrl: this.config.mcpUrl,
                apiKey: this.config.apiKey,
                timeoutMs: this.config.timeoutMs,
            });
        }
        return this.mcp;
    }
    async listTools() {
        return this.ensureMcp().listTools();
    }
    async callTool(name, args) {
        return this.ensureMcp().callTool(name, args);
    }
    /** REST GET with the provider API key header */
    async restGet(path, headers = {}) {
        const base = this.config.restBase ?? this.restBase;
        const res = await fetch(`${base}${path}`, {
            headers: {
                ...headers,
                ...(this.config.apiKey ? { 'x-api-key': this.config.apiKey } : {}),
            },
            signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000),
        });
        if (!res.ok) {
            throw new Error(`${this.id} REST ${path}: ${res.status} ${res.statusText}`);
        }
        return (await res.json());
    }
    async status() {
        const base = {
            provider: this.id,
            configured: !!this.config.apiKey || !!this.config.mcpUrl,
            mcpUrl: this.config.mcpUrl,
            restBase: this.config.restBase ?? this.restBase,
        };
        if (!base.configured) {
            base.error = `missing ${this.id.toUpperCase()}_API_KEY`;
            return base;
        }
        try {
            base.tools = await this.listTools();
        }
        catch (err) {
            base.error = err.message;
        }
        return base;
    }
}
//# sourceMappingURL=base.js.map