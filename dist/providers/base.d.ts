/**
 * Clawd Connectors — Base connector
 * Shared logic for MCP-backed provider connectors with REST fallback for
 * providers that expose an HTTP API key (Helius, Jupiter, Birdeye).
 */
import type { ClawdConnector, McpCallResult, McpToolDefinition, ProviderConfig, ProviderStatus } from '../types.js';
import { RemoteMcpClient } from '../mcp/client.js';
export declare abstract class BaseConnector implements ClawdConnector {
    readonly id: ProviderConfig['name'];
    protected config: ProviderConfig;
    protected mcp: RemoteMcpClient | null;
    constructor(config: ProviderConfig);
    /** REST base URL for providers with an HTTP API key. Empty when MCP-only. */
    protected abstract restBase: string;
    protected ensureMcp(): RemoteMcpClient;
    listTools(): Promise<McpToolDefinition[]>;
    callTool(name: string, args: Record<string, unknown>): Promise<McpCallResult>;
    /** REST GET with the provider API key header */
    protected restGet<T>(path: string, headers?: Record<string, string>): Promise<T>;
    /** REST POST with a JSON body and the provider API key header */
    protected restPost<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>;
    /** Authorization header for JWT-gated providers (Imperial). */
    protected bearerHeaders(): Record<string, string>;
    /** Fail-closed gate for value-moving calls. */
    protected requireTrading(action: string): void;
    /** Fail-closed gate for broadcasting already-signed transactions. */
    protected requireBroadcast(action: string): void;
    status(): Promise<ProviderStatus>;
}
//# sourceMappingURL=base.d.ts.map