/**
 * Clawd Connectors — MCP server tool registry
 *
 * Maps the provider classes onto MCP tools for the package's own MCP
 * server (src/mcp/server.ts, bin `clawd-connectors-mcp`).
 *
 * Exposure rules (same fail-closed model as the providers themselves):
 * - READ tools are always registered: market data, snapshots, DAS reads,
 *   quotes, and UNSIGNED transaction builds (the user's wallet always
 *   signs — a build moves no value).
 * - VALUE-MOVING tools are registered ONLY when the matching opt-in is
 *   on, mirroring the provider gates:
 *     imperial_place_order / imperial_cancel_order /
 *       imperial_build_deposit_tx      <- IMPERIAL_ALLOW_TRADING=1
 *     jupiter_swap_execute             <- JUPITER_ALLOW_TRADING=1
 *     raydium_broadcast                <- RAYDIUM_ALLOW_BROADCAST=1
 *     helius_sender_submit             <- HELIUS_ALLOW_BROADCAST=1
 *   Even then, the provider re-checks its own gate (and Imperial also
 *   requires IMPERIAL_JWT) — the registry gate is the first of two locks.
 * - Metaplex Pinata pinning is a credentialed write (not value-moving):
 *   registered only when PINATA_JWT is configured.
 * - Clawd gateway calls go through the Clawd connector with NO payment
 *   handler: payable tools surface the x402 challenge as a tool error
 *   (PaymentRequiredError). This server never pays.
 */
import { type AllConnectors } from '../index.js';
import type { ConnectorsOptions } from '../types.js';
export type ToolGate = 'imperialTrading' | 'jupiterTrading' | 'raydiumBroadcast' | 'heliusBroadcast' | 'pinata';
export interface ServerToolDef {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    /** When set, the tool is registered only if the matching opt-in is on. */
    gate?: ToolGate;
    handler: (args: Record<string, unknown>) => Promise<unknown>;
}
export interface ToolGateOptions {
    imperialAllowTrading?: boolean;
    jupiterAllowTrading?: boolean;
    raydiumAllowBroadcast?: boolean;
    heliusAllowBroadcast?: boolean;
    pinataConfigured?: boolean;
}
export declare function buildToolRegistry(connectors: AllConnectors, gates?: ToolGateOptions): ServerToolDef[];
/** Gate options from explicit overrides first, then the environment. */
export declare function gateOptionsFromEnv(overrides?: ConnectorsOptions): ToolGateOptions;
/** Build the registry the MCP server serves: providers + env/opt-in gates. */
export declare function createToolRegistry(overrides?: ConnectorsOptions): ServerToolDef[];
//# sourceMappingURL=tools.d.ts.map