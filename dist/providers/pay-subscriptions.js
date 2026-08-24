/**
 * Clawd Connectors — Pay Subscriptions (MPP subscription delegations)
 *
 * Wraps the `pay subscriptions` CLI so agents can activate, list, inspect,
 * refresh, and cancel MPP subscription delegations on Solana.
 *
 * Reference: `pay subscriptions --help`
 *   list     List subscriptions across every account, or filter by --account/--network
 *   status   Show detail for a single subscription by its base58 subscription id
 *   new      Activate a new subscription against an explicit on-chain Plan PDA
 *   cancel   Cancel a subscription by its base58 subscription id
 *   refresh  Backfill missing on-chain data on local entries
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
async function runPay(args, options) {
    const bin = options.payBinary ?? 'pay';
    const extra = [];
    if (options.account)
        extra.push('--account', options.account);
    if (options.network)
        extra.push('--network', options.network);
    try {
        const result = await execFileAsync(bin, [...extra, ...args], {
            env: process.env,
            maxBuffer: 10 * 1024 * 1024,
        });
        return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
    }
    catch (err) {
        const e = err;
        return {
            stdout: e?.stdout ? String(e.stdout).trim() : '',
            stderr: e?.stderr ? String(e.stderr).trim() : (e?.message ?? 'pay failed'),
        };
    }
}
/** Parse CLI table output into objects by header order. */
function parseTable(stdout) {
    const lines = stdout.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2)
        return [];
    const headers = lines[0].split(/\s{2,}/).map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'));
    const entries = [];
    for (const line of lines.slice(1)) {
        if (line.startsWith('---') || line.trim() === '')
            continue;
        const cells = line.split(/\s{2,}/).map((c) => c.trim());
        const entry = {};
        headers.forEach((h, i) => {
            if (i < cells.length)
                entry[h] = cells[i];
        });
        entries.push(entry);
    }
    return entries;
}
function parseOutput(stdout) {
    try {
        const parsed = JSON.parse(stdout);
        if (Array.isArray(parsed))
            return parsed;
        if (parsed && Array.isArray(parsed.subscriptions)) {
            return parsed.subscriptions;
        }
        return [parsed];
    }
    catch {
        return parseTable(stdout);
    }
}
export class PaySubscriptions {
    opts;
    constructor(opts = {}) {
        this.opts = opts;
    }
    async list() {
        const args = ['subscriptions', 'list'];
        if (this.opts.network)
            args.push('--network', this.opts.network);
        if (this.opts.account)
            args.push('--account', this.opts.account);
        const { stdout, stderr } = await runPay(args, this.opts);
        if (stderr && !stdout) {
            return { ok: false, entries: [], raw: stderr, error: stderr };
        }
        return { ok: true, entries: parseOutput(stdout), raw: stdout };
    }
    async status(subscriptionId) {
        const { stdout, stderr } = await runPay(['subscriptions', 'status', subscriptionId], this.opts);
        if (stderr && !stdout) {
            return { ok: false, entry: null, raw: stderr, error: stderr };
        }
        const entries = parseOutput(stdout);
        return { ok: true, entry: entries[0] ?? null, raw: stdout };
    }
    async refresh() {
        const result = await runPay(['subscriptions', 'refresh'], this.opts);
        return { ok: !result.stderr || !!result.stdout, raw: result.stdout || result.stderr };
    }
    async cancel(subscriptionId, opts = {}) {
        const args = ['subscriptions', 'cancel', subscriptionId];
        if (opts.localOnly)
            args.push('--local-only');
        if (opts.viaGateway)
            args.push('--via-gateway', opts.viaGateway);
        const result = await runPay(args, this.opts);
        return { ok: !result.stderr || !!result.stdout, raw: result.stdout || result.stderr };
    }
    async newSubscription(params) {
        const args = [
            'subscriptions', 'new',
            '--plan', params.plan,
            '--mint', params.mint,
            '--puller', params.puller,
            '--recipient', params.recipient,
            '--amount', params.amount,
            '--period', params.period,
        ];
        const result = await runPay(args, this.opts);
        return { ok: !result.stderr || !!result.stdout, raw: result.stdout || result.stderr };
    }
    async help() {
        const result = await runPay(['subscriptions'], this.opts);
        return { ok: true, raw: result.stdout || result.stderr };
    }
}
//# sourceMappingURL=pay-subscriptions.js.map