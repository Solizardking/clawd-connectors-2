/**
 * Clawd Connectors — Clawd (the whole Clawd Compute surface, one connector)
 *
 * Fronts every Clawd Compute MCP surface behind a single provider:
 * - gateway   https://mcp.clawdcompute.us/mcp  (also https://clawdcompute.us/mcp)
 *             272 tools at last live probe (2026-11-27): the fleet gateway —
 *             PumpAI, perps, Imperial reads, Musebook registry, market data…
 * - equities  https://mcp.equities.clawdcompute.us/mcp — 22 tools
 *             (Massive equities, Sunrise group, Backpack group, Raydium reads)
 * - boards    read-only, no-auth board MCPs, probed live 2026-11-27:
 *             decide (3) · perps (2) · map (3) · bubbles (3) · monitor (3) ·
 *             heat (2) · sun (3)
 * - skills    the Clawd skills catalogue (clawdcompute.us/skills, backed by
 *             the Solizardking/skills repo) + the served gateway SKILL.md.
 *
 * x402: gateway tools are pay-per-call ($0.01 USDC) unless free/gated.
 * Calling a payable tool WITHOUT a configured PaymentHandler throws
 * PaymentRequiredError carrying the server's challenge — this connector
 * never embeds a wallet and never pays by default. Supply
 * config.paymentHandler (or createConnectors({ clawdPaymentHandler })) to
 * pay explicitly from the embedding application.
 */
import { BaseConnector } from './base.js';
import { PaymentRequiredError } from '../mcp/client.js';
import type { McpCallResult, McpToolDefinition, ProviderConfig, ProviderStatus } from '../types.js';
export { PaymentRequiredError };
export type ClawdSurface = 'gateway' | 'equities' | 'decide' | 'perps' | 'map' | 'bubbles' | 'monitor' | 'heat' | 'sun';
export interface ClawdSurfaceInfo {
    surface: ClawdSurface;
    mcpUrl: string;
    kind: 'gateway' | 'equities' | 'board';
    /** Live-probed tool count from 2026-11-27 (re-probe with listTools). */
    probedToolCount?: number;
}
export interface ClawdSkillEntry {
    name: string;
    path: string;
    htmlUrl?: string;
}
export declare class ClawdConnector extends BaseConnector {
    protected restBase: string;
    private readonly equitiesUrl;
    private readonly clients;
    private skillsCache;
    constructor(config?: Partial<ProviderConfig> & {
        equitiesMcpUrl?: string;
    });
    /** Static surface registry (both gateway hosts serve the same gateway). */
    surfaces(): ClawdSurfaceInfo[];
    /** The alternate gateway host (same Worker, same tools). */
    gatewayAltUrl(): string;
    private clientFor;
    /** Tools for one surface (default: the gateway). */
    listTools(surface?: ClawdSurface): Promise<McpToolDefinition[]>;
    /** Tools for every surface, keyed by surface name. */
    listAllTools(): Promise<Record<ClawdSurface, McpToolDefinition[]>>;
    /**
     * Call a tool. Surface defaults to the gateway; board/equities tools must
     * be called on their own surface (tool names are only unique per surface).
     * Payable gateway calls throw PaymentRequiredError unless a
     * PaymentHandler is configured.
     */
    callTool(name: string, args?: Record<string, unknown>, surface?: ClawdSurface): Promise<McpCallResult>;
    close(): Promise<void>;
    /** List the skills in the Clawd skills catalogue (GitHub-backed). */
    listSkills(): Promise<ClawdSkillEntry[]>;
    /** Fetch one skill's SKILL.md by catalogue name, e.g. 'harmonic-aristotle'. */
    getSkill(name: string): Promise<string>;
    /** The gateway's own served SKILL.md (clawdcompute.us/SKILL.md). */
    getGatewaySkill(): Promise<string>;
    status(): Promise<ProviderStatus>;
}
//# sourceMappingURL=clawd.d.ts.map