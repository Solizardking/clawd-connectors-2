export interface EnvConfig {
    dflowApiKey: string;
    heliusApiKey: string;
    jupiterApiKey: string;
    birdeyeApiKey: string;
    dflowMcpUrl: string;
    heliusMcpUrl: string;
    jupiterMcpUrl: string;
    birdeyeMcpUrl: string;
    imperialJwt: string;
    imperialAllowTrading: boolean;
    jupiterAllowTrading: boolean;
    raydiumAllowBroadcast: boolean;
    heliusAllowBroadcast: boolean;
    solanaRpcUrl: string;
    heliusRpcUrl: string;
    heliusNetwork: 'mainnet' | 'devnet';
    pinataJwt: string;
    clawdMcpUrl: string;
    clawdEquitiesMcpUrl: string;
    timeoutMs: number;
}
export declare function getEnvConfig(): EnvConfig;
//# sourceMappingURL=config.d.ts.map