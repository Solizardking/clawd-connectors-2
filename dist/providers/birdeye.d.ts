/**
 * Clawd Connectors — Birdeye
 * MCP connector with REST fallback to https://public-api.birdeye.so
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig } from '../types.js';
export declare class BirdeyeConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
}
//# sourceMappingURL=birdeye.d.ts.map