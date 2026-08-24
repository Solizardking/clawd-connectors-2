import type { McpCallResult, McpToolDefinition, ProviderId } from '../types.js';
export interface RemoteMcpClientOptions {
    provider: ProviderId;
    mcpUrl: string;
    apiKey?: string;
    timeoutMs?: number;
}
export declare class RemoteMcpClient {
    private readonly provider;
    private readonly mcpUrl;
    private readonly apiKey?;
    private client;
    private transport;
    private toolCache;
    constructor(options: RemoteMcpClientOptions);
    connect(): Promise<void>;
    listTools(): Promise<McpToolDefinition[]>;
    callTool(name: string, args: Record<string, unknown>): Promise<McpCallResult>;
    close(): Promise<void>;
}
export declare function mcpUrlFor(provider: ProviderId): string;
//# sourceMappingURL=client.d.ts.map