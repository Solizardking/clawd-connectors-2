/**
 * Clawd Connectors — MCP-powered provider integrations
 */
export * from './types.js';
export * from './providers/index.js';
export { RemoteMcpClient, PaymentRequiredError, withPaymentHandling } from './mcp/client.js';
import { getEnvConfig } from './config.js';
import { DFlowConnector, HeliusConnector, JupiterConnector, BirdeyeConnector, BackpackConnector, ImperialConnector, PhoenixConnector, RaydiumConnector, MetaplexConnector, SunriseConnector, ClawdComputeConnector, } from './providers/index.js';
export function createConnectors(overrides = {}) {
    const env = getEnvConfig();
    const timeoutMs = overrides.timeoutMs ?? env.timeoutMs;
    return {
        dflow: new DFlowConnector({
            apiKey: overrides.dflowApiKey ?? env.dflowApiKey,
            mcpUrl: overrides.dflowMcpUrl ?? env.dflowMcpUrl,
            timeoutMs,
        }),
        helius: new HeliusConnector({
            apiKey: overrides.heliusApiKey ?? env.heliusApiKey,
            mcpUrl: overrides.heliusMcpUrl ?? env.heliusMcpUrl,
            rpcUrl: env.heliusRpcUrl || undefined,
            network: env.heliusNetwork,
            allowBroadcast: overrides.heliusAllowBroadcast ?? env.heliusAllowBroadcast,
            timeoutMs,
        }),
        jupiter: new JupiterConnector({
            apiKey: overrides.jupiterApiKey ?? env.jupiterApiKey,
            mcpUrl: overrides.jupiterMcpUrl ?? env.jupiterMcpUrl,
            allowTrading: overrides.jupiterAllowTrading ?? env.jupiterAllowTrading,
            timeoutMs,
        }),
        birdeye: new BirdeyeConnector({
            apiKey: overrides.birdeyeApiKey ?? env.birdeyeApiKey,
            mcpUrl: overrides.birdeyeMcpUrl ?? env.birdeyeMcpUrl,
            timeoutMs,
        }),
        backpack: new BackpackConnector({ apiKey: '', timeoutMs }),
        imperial: new ImperialConnector({
            apiKey: '',
            jwt: overrides.imperialJwt ?? env.imperialJwt ?? undefined,
            allowTrading: overrides.imperialAllowTrading ?? env.imperialAllowTrading,
            timeoutMs,
        }),
        phoenix: new PhoenixConnector({ apiKey: '', timeoutMs }),
        raydium: new RaydiumConnector({
            apiKey: '',
            rpcUrl: overrides.solanaRpcUrl ?? env.solanaRpcUrl ?? undefined,
            allowBroadcast: overrides.raydiumAllowBroadcast ?? env.raydiumAllowBroadcast,
            timeoutMs,
        }),
        metaplex: new MetaplexConnector({
            apiKey: '',
            rpcUrl: overrides.solanaRpcUrl ?? env.solanaRpcUrl ?? undefined,
            pinataJwt: overrides.pinataJwt ?? env.pinataJwt ?? undefined,
            timeoutMs,
        }),
        sunrise: new SunriseConnector({ apiKey: '', timeoutMs }),
        clawd: new ClawdComputeConnector({
            apiKey: '',
            mcpUrl: overrides.clawdMcpUrl ?? env.clawdMcpUrl,
            equitiesMcpUrl: overrides.clawdEquitiesMcpUrl ?? env.clawdEquitiesMcpUrl,
            paymentHandler: overrides.clawdPaymentHandler,
            timeoutMs,
        }),
    };
}
//# sourceMappingURL=index.js.map