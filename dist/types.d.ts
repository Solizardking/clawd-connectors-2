/**
 * Clawd Connectors — shared types
 */
export type ProviderId = 'dflow' | 'helius' | 'jupiter' | 'birdeye' | 'backpack' | 'imperial' | 'phoenix' | 'raydium' | 'metaplex' | 'sunrise' | 'clawd';
/** Parsed x402 payment challenge from an HTTP 402 response. */
export interface X402Challenge {
    /** Raw challenge body text (JSON when the server sent JSON). */
    raw: string;
    /** Parsed challenge JSON when the body was JSON. */
    json?: Record<string, unknown>;
    /** Value of the PAYMENT-REQUIRED response header, when present. */
    header?: string;
    /** HTTP status (always 402). */
    status: 402;
}
/**
 * User-supplied payment hook. Given an x402 challenge, return extra request
 * headers (e.g. a signed X-PAYMENT header) to retry the call with, or null to
 * refuse payment. The package never ships a default implementation — paying
 * is always the embedding application's explicit choice.
 */
export type PaymentHandler = (challenge: X402Challenge) => Promise<Record<string, string> | null>;
export interface ProviderConfig {
    /** Provider name */
    name: ProviderId;
    /** API key for REST calls */
    apiKey: string;
    /** Remote MCP server URL (e.g. https://api.paybox.sh/mcp?app=dflow) */
    mcpUrl?: string;
    /** REST base URL */
    restBase?: string;
    /** Timeout in ms */
    timeoutMs?: number;
    /** Bearer JWT for JWT-gated providers (Imperial). Treated as a credential. */
    jwt?: string;
    /** Solana RPC URL for providers that read chain state directly (Metaplex). */
    rpcUrl?: string;
    /** Helius cluster for RPC/DAS URLs. Default 'mainnet'. */
    network?: 'mainnet' | 'devnet';
    /**
     * Master switch for value-moving calls (order placement, swap execute).
     * Defaults OFF — mutating methods refuse unless this is explicitly true.
     */
    allowTrading?: boolean;
    /**
     * Master switch for broadcasting already-signed transactions (Raydium
     * broadcast, Helius Sender submit). Defaults OFF.
     */
    allowBroadcast?: boolean;
    /** x402 payment hook for payable MCP tools (Clawd gateway). Default: none. */
    paymentHandler?: PaymentHandler;
    /** Pinata JWT for Metaplex metadata pinning. */
    pinataJwt?: string;
}
export interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    /** MCP tool annotations (readOnlyHint, destructiveHint, ...) when served. */
    annotations?: Record<string, unknown>;
    /** Tool _meta passthrough when served. */
    meta?: Record<string, unknown>;
}
export interface McpCallResult {
    content: Array<{
        type: string;
        text?: string;
    }>;
    isError?: boolean;
}
export interface ProviderStatus {
    provider: ProviderId;
    configured: boolean;
    mcpUrl?: string;
    restBase?: string;
    tools?: McpToolDefinition[];
    error?: string;
    /** Free-form detail (e.g. which optional credentials are present). */
    note?: string;
}
export interface ClawdConnector {
    readonly id: ProviderId;
    /** List available MCP tools */
    listTools(): Promise<McpToolDefinition[]>;
    /** Call an MCP tool by name with JSON args */
    callTool(name: string, args: Record<string, unknown>): Promise<McpCallResult>;
    /** Check connectivity / config */
    status(): Promise<ProviderStatus>;
}
export interface ConnectorsOptions {
    dflowApiKey?: string;
    heliusApiKey?: string;
    jupiterApiKey?: string;
    birdeyeApiKey?: string;
    dflowMcpUrl?: string;
    heliusMcpUrl?: string;
    jupiterMcpUrl?: string;
    birdeyeMcpUrl?: string;
    /** Imperial trading JWT (IMPERIAL_JWT). */
    imperialJwt?: string;
    /** Opt-in: enable value-moving calls (Imperial orders, Jupiter execute). */
    imperialAllowTrading?: boolean;
    jupiterAllowTrading?: boolean;
    /** Opt-in: enable broadcasting user-signed transactions. */
    raydiumAllowBroadcast?: boolean;
    heliusAllowBroadcast?: boolean;
    /** Solana RPC URL used by Raydium broadcast / Metaplex reads. */
    solanaRpcUrl?: string;
    /** Pinata JWT for Metaplex metadata pinning. */
    pinataJwt?: string;
    /** Clawd gateway MCP URL override (default https://mcp.clawdcompute.us/mcp). */
    clawdMcpUrl?: string;
    /** Clawd equities MCP URL override. */
    clawdEquitiesMcpUrl?: string;
    /** x402 payment hook for payable Clawd gateway tools. Default: none. */
    clawdPaymentHandler?: PaymentHandler;
    timeoutMs?: number;
}
//# sourceMappingURL=types.d.ts.map