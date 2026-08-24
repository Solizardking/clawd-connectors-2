/**
 * Clawd Connectors — Helius
 * MCP connector with REST fallback to https://api.helius.dev
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig } from '../types.js';
export declare class HeliusConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
    /** RPC-style convenience: POST JSON-RPC to Helius */
    rpc<T>(method: string, params?: unknown[]): Promise<T>;
}
//# sourceMappingURL=helius.d.ts.map