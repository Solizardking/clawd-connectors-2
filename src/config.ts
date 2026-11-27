/**
 * Clawd Connectors — environment configuration
 *
 * API keys (all optional; keyless providers work without any):
 *   DFLOW_API_KEY, HELIUS_API_KEY, JUPITER_API_KEY, BIRDEYE_API_KEY
 * Credentials / opt-ins:
 *   IMPERIAL_JWT               Imperial trading JWT (a trading credential)
 *   IMPERIAL_ALLOW_TRADING=1   enable Imperial order placement/cancel
 *   JUPITER_ALLOW_TRADING=1    enable Jupiter swap execute
 *   RAYDIUM_ALLOW_BROADCAST=1  enable broadcasting user-signed Raydium txs
 *   HELIUS_ALLOW_BROADCAST=1   enable Helius Sender submit of signed txs
 *   PINATA_JWT                 Metaplex metadata pinning
 *   SOLANA_RPC_URL             RPC for Metaplex DAS reads / Raydium broadcast
 *   HELIUS_RPC_URL             override Helius RPC/DAS endpoint
 *   HELIUS_NETWORK             mainnet (default) | devnet
 */
import { config as loadEnv } from 'dotenv';

// Load .env from the package directory or project root
loadEnv();

function getEnv(name: string): string {
  return process.env[name] ?? '';
}

function getFlag(name: string): boolean {
  return getEnv(name) === '1' || getEnv(name).toLowerCase() === 'true';
}

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

export function getEnvConfig(): EnvConfig {
  return {
    dflowApiKey: getEnv('DFLOW_API_KEY'),
    heliusApiKey: getEnv('HELIUS_API_KEY'),
    jupiterApiKey: getEnv('JUPITER_API_KEY'),
    birdeyeApiKey: getEnv('BIRDEYE_API_KEY'),
    dflowMcpUrl: getEnv('DFLOW_MCP_URL') || 'https://api.paybox.sh/mcp?app=dflow',
    heliusMcpUrl: getEnv('HELIUS_MCP_URL') || 'https://api.helius.dev/mcp',
    jupiterMcpUrl: getEnv('JUPITER_MCP_URL') || 'https://api.jup.ag/mcp',
    birdeyeMcpUrl: getEnv('BIRDEYE_MCP_URL') || 'https://public-api.birdeye.so/mcp',
    imperialJwt: getEnv('IMPERIAL_JWT'),
    imperialAllowTrading: getFlag('IMPERIAL_ALLOW_TRADING'),
    jupiterAllowTrading: getFlag('JUPITER_ALLOW_TRADING'),
    raydiumAllowBroadcast: getFlag('RAYDIUM_ALLOW_BROADCAST'),
    heliusAllowBroadcast: getFlag('HELIUS_ALLOW_BROADCAST'),
    solanaRpcUrl: getEnv('SOLANA_RPC_URL'),
    heliusRpcUrl: getEnv('HELIUS_RPC_URL'),
    heliusNetwork: getEnv('HELIUS_NETWORK') === 'devnet' ? 'devnet' : 'mainnet',
    pinataJwt: getEnv('PINATA_JWT'),
    clawdMcpUrl: getEnv('CLAWD_MCP_URL') || 'https://mcp.clawdcompute.us/mcp',
    clawdEquitiesMcpUrl:
      getEnv('CLAWD_EQUITIES_MCP_URL') || 'https://mcp.equities.clawdcompute.us/mcp',
    timeoutMs: parseInt(getEnv('CLAWD_CONNECTORS_TIMEOUT_MS') || '15000', 10),
  };
}
