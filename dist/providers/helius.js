/**
 * Clawd Connectors — Helius
 * MCP connector with REST fallback to https://api.helius.dev
 */
import { BaseConnector } from './base.js';
const HELIUS_REST_BASE = 'https://api.helius.dev';
export class HeliusConnector extends BaseConnector {
    restBase = HELIUS_REST_BASE;
    constructor(config = {}) {
        super({ name: 'helius', apiKey: '', ...config });
    }
    /** RPC-style convenience: POST JSON-RPC to Helius */
    async rpc(method, params = []) {
        const base = this.config.restBase ?? HELIUS_REST_BASE;
        const res = await fetch(`${base}/v0/rpc/${this.config.apiKey ? `?api-key=${this.config.apiKey}` : ''}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
            signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000),
        });
        if (!res.ok)
            throw new Error(`helius rpc ${method}: ${res.status} ${res.statusText}`);
        const json = (await res.json());
        if (json.error)
            throw new Error(`helius rpc ${method}: ${json.error.message}`);
        return json.result;
    }
}
//# sourceMappingURL=helius.js.map