/**
 * Clawd Connectors — MCP-powered provider integrations
 */
export * from './types.js';
export * from './providers/index.js';
export { RemoteMcpClient, PaymentRequiredError, withPaymentHandling } from './mcp/client.js';
export { buildToolRegistry, createToolRegistry, gateOptionsFromEnv } from './mcp/tools.js';
export type { ServerToolDef, ToolGate, ToolGateOptions } from './mcp/tools.js';
export { createConnectorsMcpServer, SERVER_NAME, SERVER_VERSION } from './mcp/server.js';
import type { ClawdConnector as ClawdConnectorIface, ConnectorsOptions } from './types.js';
export type AllConnectors = Record<'dflow' | 'helius' | 'jupiter' | 'birdeye' | 'backpack' | 'imperial' | 'phoenix' | 'raydium' | 'metaplex' | 'sunrise' | 'clawd', ClawdConnectorIface>;
export declare function createConnectors(overrides?: ConnectorsOptions): AllConnectors;
//# sourceMappingURL=index.d.ts.map