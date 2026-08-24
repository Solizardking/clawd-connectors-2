/**
 * Clawd Connectors — DFlow
 * Remote MCP connector: https://api.paybox.sh/mcp?app=dflow
 * Fallback REST when DFLOW_API_KEY is set.
 */
import { BaseConnector } from './base.js';
import type { ProviderConfig } from '../types.js';
export declare class DFlowConnector extends BaseConnector {
    protected restBase: string;
    constructor(config?: Partial<ProviderConfig>);
}
//# sourceMappingURL=dflow.d.ts.map