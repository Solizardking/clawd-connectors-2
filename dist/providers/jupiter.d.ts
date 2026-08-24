/**
 * Clawd Connectors — Jupiter
 * MCP connector with REST fallback to https://quote-api.jup.ag / api.jup.ag
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig } from '../types.js';
export declare class JupiterConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
    /** Quote convenience (v6) */
    quote(params: {
        inputMint: string;
        outputMint: string;
        amount: number;
        slippageBps?: number;
    }): Promise<{
        outAmount: string;
        routePlan: unknown[];
    }>;
}
//# sourceMappingURL=jupiter.d.ts.map