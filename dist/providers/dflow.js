/**
 * Clawd Connectors — DFlow
 * Remote MCP connector: https://api.paybox.sh/mcp?app=dflow
 * Fallback REST when DFLOW_API_KEY is set.
 */
import { BaseConnector } from './base.js';
const DFLOW_REST_BASE = 'https://api.dflow.net';
export class DFlowConnector extends BaseConnector {
    restBase = DFLOW_REST_BASE;
    constructor(config = {}) {
        super({ name: 'dflow', apiKey: '', ...config });
    }
}
//# sourceMappingURL=dflow.js.map