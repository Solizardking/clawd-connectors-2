import type { McpCallResult, McpToolDefinition, PaymentHandler, ProviderId, X402Challenge } from '../types.js';
/** Thrown when a call needs x402 payment but no payment handler is configured. */
export declare class PaymentRequiredError extends Error {
    readonly challenge: X402Challenge;
    constructor(provider: string, challenge: X402Challenge);
}
type FetchFn = typeof fetch;
/**
 * Wrap a fetch implementation with x402 challenge handling.
 * Exported for direct unit testing.
 */
export declare function withPaymentHandling(baseFetch: FetchFn, handler: PaymentHandler | undefined, provider: string): FetchFn;
export interface RemoteMcpClientOptions {
    provider: ProviderId;
    mcpUrl: string;
    apiKey?: string;
    timeoutMs?: number;
    /** x402 payment hook; default none (payable calls throw PaymentRequiredError). */
    paymentHandler?: PaymentHandler;
}
export declare class RemoteMcpClient {
    private readonly provider;
    private readonly mcpUrl;
    private readonly apiKey?;
    private readonly paymentHandler?;
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
export {};
//# sourceMappingURL=client.d.ts.map