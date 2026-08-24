/**
 * Clawd Connectors — MCP-powered provider integrations
 */
export * from './types.js';
export * from './providers/index.js';
export { RemoteMcpClient } from './mcp/client.js';
import type { ClawdConnector } from './types.js';
export declare function createConnectors(overrides?: {
    dflowApiKey?: string;
    heliusApiKey?: string;
    jupiterApiKey?: string;
    birdeyeApiKey?: string;
    dflowMcpUrl?: string;
    heliusMcpUrl?: string;
    jupiterMcpUrl?: string;
    birdeyeMcpUrl?: string;
    timeoutMs?: number;
}): Record<'dflow' | 'helius' | 'jupiter' | 'birdeye', ClawdConnector>;
//# sourceMappingURL=index.d.ts.map