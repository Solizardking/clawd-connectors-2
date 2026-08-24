/**
 * Clawd Connectors — environment configuration
 * Loads DFLOW_API_KEY, HELIUS_API_KEY, JUPITER_API_KEY, BIRDEYE_API_KEY
 */
import { config as loadEnv } from 'dotenv';
// Load .env from the package directory or project root
loadEnv();
function getEnv(name) {
    return process.env[name] ?? '';
}
export function getEnvConfig() {
    return {
        dflowApiKey: getEnv('DFLOW_API_KEY'),
        heliusApiKey: getEnv('HELIUS_API_KEY'),
        jupiterApiKey: getEnv('JUPITER_API_KEY'),
        birdeyeApiKey: getEnv('BIRDEYE_API_KEY'),
        dflowMcpUrl: getEnv('DFLOW_MCP_URL') || 'https://api.paybox.sh/mcp?app=dflow',
        heliusMcpUrl: getEnv('HELIUS_MCP_URL'),
        jupiterMcpUrl: getEnv('JUPITER_MCP_URL'),
        birdeyeMcpUrl: getEnv('BIRDEYE_MCP_URL'),
        timeoutMs: parseInt(getEnv('CLAWD_CONNECTORS_TIMEOUT_MS') || '15000', 10),
    };
}
//# sourceMappingURL=config.js.map