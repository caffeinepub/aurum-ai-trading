import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TradingSignal {
    id: bigint;
    status: string;
    direction: string;
    tradeType: string;
    confidenceScore: bigint;
    rrRatio: number;
    stopLoss: number;
    timestamp: bigint;
    entryPrice: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    aiReasoning: string;
    strategyTags: Array<string>;
    symbol: string;
}
export interface PriceCache {
    timestamp: bigint;
    price: number;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface BacktestResult {
    id: bigint;
    totalTrades: bigint;
    endDate: bigint;
    sharpeRatio: number;
    resultsJSON: string;
    winRate: number;
    strategyName: string;
    maxDrawdown: number;
    profitFactor: number;
    startDate: bigint;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface UserSettings {
    maxDailyTrades: bigint;
    notificationsEnabled: boolean;
    preferredTimeframe: string;
    riskPercentage: number;
    autoTrade: boolean;
}
export interface TradeResult {
    duration: bigint;
    pnlPercent: number;
    signalId: bigint;
    pnlPips: number;
    timestamp: bigint;
    entryPrice: number;
    exitPrice: number;
    outcome: string;
}
export interface UserProfile {
    name: string;
}
export interface http_header {
    value: string;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addTradeResult(trade: TradeResult): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createSignal(signal: TradingSignal): Promise<bigint>;
    deleteSignal(id: bigint): Promise<void>;
    getActiveSignals(): Promise<Array<TradingSignal>>;
    getAllSignals(): Promise<Array<TradingSignal>>;
    getBacktestResults(): Promise<Array<BacktestResult>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPriceCache(): Promise<PriceCache | null>;
    getSignal(id: bigint): Promise<TradingSignal | null>;
    getTradeHistory(): Promise<Array<TradeResult>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSettings(): Promise<UserSettings>;
    isCallerAdmin(): Promise<boolean>;
    refreshPrice(): Promise<number>;
    saveBacktestResult(result: BacktestResult): Promise<bigint>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateSignalStatus(id: bigint, status: string): Promise<void>;
    updateUserSettings(settings: UserSettings): Promise<void>;
}
