export interface PaySubscriptionsOptions {
    payBinary?: string;
    account?: string;
    network?: string;
}
export interface SubscriptionEntry {
    subscription_id?: string;
    plan?: string;
    mint?: string;
    recipient?: string;
    puller?: string;
    amount?: string;
    period_count?: number | string;
    period_unit?: string;
    status?: string;
    activation_signature?: string;
    [key: string]: unknown;
}
export interface SubscriptionListResult {
    ok: boolean;
    entries: SubscriptionEntry[];
    raw: string;
    error?: string;
}
export interface SubscriptionStatusResult {
    ok: boolean;
    entry: SubscriptionEntry | null;
    raw: string;
    error?: string;
}
export interface SubscriptionActionResult {
    ok: boolean;
    raw: string;
    error?: string;
}
export declare class PaySubscriptions {
    private opts;
    constructor(opts?: PaySubscriptionsOptions);
    list(): Promise<SubscriptionListResult>;
    status(subscriptionId: string): Promise<SubscriptionStatusResult>;
    refresh(): Promise<SubscriptionActionResult>;
    cancel(subscriptionId: string, opts?: {
        localOnly?: boolean;
        viaGateway?: string;
    }): Promise<SubscriptionActionResult>;
    newSubscription(params: {
        plan: string;
        mint: string;
        puller: string;
        recipient: string;
        amount: string;
        period: string;
    }): Promise<SubscriptionActionResult>;
    help(): Promise<SubscriptionActionResult>;
}
//# sourceMappingURL=pay-subscriptions.d.ts.map