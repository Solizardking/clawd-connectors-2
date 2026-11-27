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
import { RemoteMcpClient, PaymentRequiredError } from '../mcp/client.js';
export { PaymentRequiredError };
const GATEWAY_URL = 'https://mcp.clawdcompute.us/mcp';
const GATEWAY_ALT_URL = 'https://clawdcompute.us/mcp';
const EQUITIES_URL = 'https://mcp.equities.clawdcompute.us/mcp';
const SKILLS_REPO_API = 'https://api.github.com/repos/Solizardking/skills/contents/skills';
const SKILLS_RAW_BASE = 'https://raw.githubusercontent.com/Solizardking/skills/main/skills';
const GATEWAY_SKILL_URL = 'https://clawdcompute.us/SKILL.md';
const BOARD_URLS = {
    decide: 'https://decide.clawdcompute.us/mcp',
    perps: 'https://perps.clawdcompute.us/mcp',
    map: 'https://map.clawdcompute.us/mcp',
    bubbles: 'https://bubbles.clawdcompute.us/mcp',
    monitor: 'https://monitor.clawdcompute.us/mcp',
    heat: 'https://heat.clawdcompute.us/mcp',
    sun: 'https://sun.clawdcompute.us/mcp',
};
/** Tool counts measured live on 2026-11-27 — informational, not asserted. */
const PROBED_COUNTS = {
    gateway: 272,
    equities: 22,
    decide: 3,
    perps: 2,
    map: 3,
    bubbles: 3,
    monitor: 3,
    heat: 2,
    sun: 3,
};
export class ClawdConnector extends BaseConnector {
    restBase = 'https://clawdcompute.us';
    equitiesUrl;
    clients = new Map();
    skillsCache = null;
    constructor(config = {}) {
        super({ name: 'clawd', apiKey: '', mcpUrl: GATEWAY_URL, ...config });
        this.equitiesUrl = config.equitiesMcpUrl ?? EQUITIES_URL;
    }
    /** Static surface registry (both gateway hosts serve the same gateway). */
    surfaces() {
        const gatewayUrl = this.config.mcpUrl ?? GATEWAY_URL;
        const out = [
            { surface: 'gateway', mcpUrl: gatewayUrl, kind: 'gateway', probedToolCount: PROBED_COUNTS.gateway },
            { surface: 'equities', mcpUrl: this.equitiesUrl, kind: 'equities', probedToolCount: PROBED_COUNTS.equities },
        ];
        for (const [surface, mcpUrl] of Object.entries(BOARD_URLS)) {
            out.push({
                surface: surface,
                mcpUrl,
                kind: 'board',
                probedToolCount: PROBED_COUNTS[surface],
            });
        }
        return out;
    }
    /** The alternate gateway host (same Worker, same tools). */
    gatewayAltUrl() {
        return GATEWAY_ALT_URL;
    }
    clientFor(surface) {
        let client = this.clients.get(surface);
        if (client)
            return client;
        const info = this.surfaces().find((s) => s.surface === surface);
        if (!info)
            throw new Error(`clawd: unknown surface ${surface}`);
        client = new RemoteMcpClient({
            provider: 'clawd',
            mcpUrl: info.mcpUrl,
            timeoutMs: this.config.timeoutMs,
            paymentHandler: this.config.paymentHandler,
        });
        this.clients.set(surface, client);
        return client;
    }
    /** Tools for one surface (default: the gateway). */
    async listTools(surface = 'gateway') {
        return this.clientFor(surface).listTools();
    }
    /** Tools for every surface, keyed by surface name. */
    async listAllTools() {
        const entries = await Promise.all(this.surfaces().map(async (s) => [s.surface, await this.listTools(s.surface)]));
        return Object.fromEntries(entries);
    }
    /**
     * Call a tool. Surface defaults to the gateway; board/equities tools must
     * be called on their own surface (tool names are only unique per surface).
     * Payable gateway calls throw PaymentRequiredError unless a
     * PaymentHandler is configured.
     */
    async callTool(name, args = {}, surface = 'gateway') {
        return this.clientFor(surface).callTool(name, args);
    }
    async close() {
        await Promise.all([...this.clients.values()].map((c) => c.close()));
        this.clients.clear();
    }
    // ── Skills catalogue ────────────────────────────────────────────────────
    /** List the skills in the Clawd skills catalogue (GitHub-backed). */
    async listSkills() {
        if (this.skillsCache)
            return this.skillsCache;
        const res = await fetch(SKILLS_REPO_API, {
            headers: { Accept: 'application/vnd.github+json' },
            signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000),
        });
        if (!res.ok)
            throw new Error(`clawd skills list: ${res.status} ${res.statusText}`);
        const entries = (await res.json());
        this.skillsCache = entries
            .filter((e) => e.type === 'dir')
            .map((e) => ({ name: e.name, path: e.path, htmlUrl: e.html_url }));
        return this.skillsCache;
    }
    /** Fetch one skill's SKILL.md by catalogue name, e.g. 'harmonic-aristotle'. */
    async getSkill(name) {
        const url = `${SKILLS_RAW_BASE}/${encodeURIComponent(name)}/SKILL.md`;
        const res = await fetch(url, { signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000) });
        if (!res.ok)
            throw new Error(`clawd skill ${name}: ${res.status} ${res.statusText}`);
        return res.text();
    }
    /** The gateway's own served SKILL.md (clawdcompute.us/SKILL.md). */
    async getGatewaySkill() {
        const res = await fetch(GATEWAY_SKILL_URL, {
            signal: AbortSignal.timeout(this.config.timeoutMs ?? 15000),
        });
        if (!res.ok)
            throw new Error(`clawd gateway skill: ${res.status} ${res.statusText}`);
        return res.text();
    }
    async status() {
        const base = {
            provider: this.id,
            configured: true, // keyless MCP surfaces; payment is opt-in per call
            mcpUrl: this.config.mcpUrl ?? GATEWAY_URL,
            restBase: this.restBase,
            note: `surfaces=${this.surfaces().length} (gateway+equities+7 boards) ` +
                `payment=${this.config.paymentHandler ? 'handler configured' : 'not configured (payable tools throw PaymentRequiredError)'}`,
        };
        try {
            base.tools = await this.listTools('gateway');
        }
        catch (err) {
            base.error = err.message;
        }
        return base;
    }
}
//# sourceMappingURL=clawd.js.map