/**
 * Clawd Connectors — Jupiter
 * MCP connector with REST fallback to https://quote-api.jup.ag / api.jup.ag
 */
import { BaseConnector } from './base.js';
const JUPITER_REST_BASE = 'https://quote-api.jup.ag';
export class JupiterConnector extends BaseConnector {
    restBase = JUPITER_REST_BASE;
    constructor(config = {}) {
        super({ name: 'jupiter', apiKey: '', ...config });
    }
    /** Quote convenience (v6) */
    async quote(params) {
        const qs = new URLSearchParams({
            inputMint: params.inputMint,
            outputMint: params.outputMint,
            amount: String(params.amount),
            ...(params.slippageBps ? { slippageBps: String(params.slippageBps) } : {}),
        });
        return this.restGet(`/v6/quote?${qs.toString()}`);
    }
}
//# sourceMappingURL=jupiter.js.map