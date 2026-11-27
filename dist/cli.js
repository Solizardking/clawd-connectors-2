/**
 * Clawd Connectors — CLI
 */
import { createConnectors } from './index.js';
import { getEnvConfig } from './config.js';
import { PaySubscriptions } from './providers/pay-subscriptions.js';
function paySubscriptionsFromArgs(args) {
    const accountIndex = args.indexOf('--account');
    const networkIndex = args.indexOf('--network');
    return new PaySubscriptions({
        account: accountIndex >= 0 ? args[accountIndex + 1] : undefined,
        network: networkIndex >= 0 ? args[networkIndex + 1] : undefined,
    });
}
async function main() {
    const args = process.argv.slice(2);
    const command = args[0]?.toLowerCase();
    if (command === 'subscriptions') {
        const sub = args[1]?.toLowerCase();
        const pay = paySubscriptionsFromArgs(args.slice(2));
        if (sub === 'list' || !sub) {
            const result = await pay.list();
            console.log(result.raw || result.error || '(no subscriptions)');
        }
        else if (sub === 'status') {
            const id = (args[2]?.split('--')[0]) ?? '';
            if (!id) {
                console.error('usage: clawd-connectors subscriptions status <subscription_id>');
                process.exit(2);
            }
            const result = await pay.status(id);
            console.log(result.raw || (result.error ?? '(no subscription)'));
        }
        else if (sub === 'refresh') {
            const result = await pay.refresh();
            console.log(result.raw || result.error || '(refreshed)');
        }
        else if (sub === 'cancel') {
            const id = (args[2]?.split('--')[0]) ?? '';
            if (!id) {
                console.error('usage: clawd-connectors subscriptions cancel <subscription_id> [--local-only]');
                process.exit(2);
            }
            const result = await pay.cancel(id, { localOnly: args.includes('--local-only') });
            console.log(result.raw || result.error || '(cancelled)');
        }
        else if (sub === 'new') {
            const get = (flag) => {
                const i = args.indexOf(flag);
                return i >= 0 ? (args[i + 1] ?? '') : '';
            };
            const result = await pay.newSubscription({
                plan: get('--plan'),
                mint: get('--mint'),
                puller: get('--puller'),
                recipient: get('--recipient'),
                amount: get('--amount'),
                period: get('--period'),
            });
            console.log(result.raw || (result.error ?? '(activated)'));
        }
        else {
            const result = await pay.help();
            console.log(result.raw);
        }
        return;
    }
    if (command === 'status' || command === 'doctor') {
        const env = getEnvConfig();
        console.log('🦞 Clawd Connectors');
        console.log('═══════════════════════════════════════');
        console.log(`  DFLOW_API_KEY      ${env.dflowApiKey ? '✓ set' : '✗ missing'}`);
        console.log(`  HELIUS_API_KEY     ${env.heliusApiKey ? '✓ set' : '✗ missing'}`);
        console.log(`  JUPITER_API_KEY    ${env.jupiterApiKey ? '✓ set' : '✗ missing'}`);
        console.log(`  BIRDEYE_API_KEY    ${env.birdeyeApiKey ? '✓ set' : '✗ missing'}`);
        console.log(`  IMPERIAL_JWT       ${env.imperialJwt ? '✓ set' : '✗ missing (public reads still work)'}`);
        console.log(`  PINATA_JWT         ${env.pinataJwt ? '✓ set' : '✗ missing (Metaplex pinning off)'}`);
        console.log(`  SOLANA_RPC_URL     ${env.solanaRpcUrl ? '✓ set' : '✗ default'}`);
        console.log(`  Trading opt-ins    imperial=${env.imperialAllowTrading ? 'ON' : 'off'} jupiter=${env.jupiterAllowTrading ? 'ON' : 'off'} (fail-closed by default)`);
        console.log(`  Broadcast opt-ins  raydium=${env.raydiumAllowBroadcast ? 'ON' : 'off'} helius=${env.heliusAllowBroadcast ? 'ON' : 'off'}`);
        console.log('');
        const connectors = createConnectors();
        for (const [id, connector] of Object.entries(connectors)) {
            const s = await connector.status();
            console.log(`  ${id.padEnd(9)} ${s.configured ? '✓' : '✗'}  mcp=${s.mcpUrl ?? '(none)'}${s.error ? `  error=${s.error}` : ''}${s.tools ? `  tools=${s.tools.length}` : ''}`);
        }
        return;
    }
    if (command === 'list-tools') {
        const provider = args[1]?.toLowerCase();
        const known = [
            'dflow', 'helius', 'jupiter', 'birdeye', 'backpack', 'imperial',
            'phoenix', 'raydium', 'metaplex', 'sunrise', 'clawd',
        ];
        if (!provider || !known.includes(provider)) {
            console.error(`usage: clawd-connectors list-tools <${known.join('|')}> [--surface <clawd-surface>]`);
            process.exit(2);
        }
        const connectors = createConnectors();
        const conn = connectors[provider];
        // The Clawd connector fronts multiple surfaces; --surface picks one.
        let tools;
        if (provider === 'clawd') {
            const { ClawdConnector } = await import('./providers/clawd.js');
            const clawd = connectors.clawd;
            const sIdx = args.indexOf('--surface');
            const surface = (sIdx >= 0 ? args[sIdx + 1] : 'gateway');
            tools = await clawd.listTools(surface);
            console.log(`\n  clawd[${surface}] tools (${tools.length}):`);
        }
        else {
            tools = await conn.listTools();
            console.log(`\n  ${provider} tools (${tools.length}):`);
        }
        for (const t of tools) {
            console.log(`    • ${t.name}  — ${t.description}`);
        }
        return;
    }
    if (command === 'clawd-surfaces') {
        const { ClawdConnector } = await import('./providers/clawd.js');
        const connectors = createConnectors();
        const clawd = connectors.clawd;
        console.log('\n  Clawd Compute surfaces (one connector):');
        for (const s of clawd.surfaces()) {
            console.log(`    ${s.surface.padEnd(9)} ${s.kind.padEnd(8)} ${s.mcpUrl}  (probed ${s.probedToolCount ?? '?'} tools, 2026-11-27)`);
        }
        const skills = await clawd.listSkills().catch((e) => {
            console.log(`    skills    unavailable: ${e.message}`);
            return [];
        });
        if (skills.length)
            console.log(`    skills    ${skills.length} skills in the catalogue`);
        return;
    }
    console.log(`
  Clawd Connectors — MCP provider connectors

  USAGE:
    clawd-connectors status         Show API key + MCP status for all providers
    clawd-connectors list-tools <p> List MCP tools for a provider
                                    (clawd takes --surface <gateway|equities|decide|perps|map|bubbles|monitor|heat|sun>)
    clawd-connectors clawd-surfaces Show every Clawd Compute surface + skills count
    clawd-connectors subscriptions  Pay subscriptions helper (list|status|new|cancel|refresh)
    clawd-connectors help           Show this help

  PROVIDERS:
    dflow · helius · jupiter · birdeye · backpack · imperial · phoenix ·
    raydium · metaplex · sunrise · clawd (all of Clawd Compute in one)
  `);
}
main().catch((err) => {
    console.error('  ✗ Fatal error:', err.message);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map