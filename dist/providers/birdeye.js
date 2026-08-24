/**
 * Clawd Connectors — Birdeye
 * MCP connector with REST fallback to https://public-api.birdeye.so
 */
import { BaseConnector } from './base.js';
const BIRDEYE_REST_BASE = 'https://public-api.birdeye.so';
export class BirdeyeConnector extends BaseConnector {
    restBase = BIRDEYE_REST_BASE;
    constructor(config = {}) {
        super({ name: 'birdeye', apiKey: '', ...config });
    }
}
//# sourceMappingURL=birdeye.js.map