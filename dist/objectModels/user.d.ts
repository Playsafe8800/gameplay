export interface UserProfile {
    id: number;
    displayName: string;
    avatarUrl: string;
    userName: string;
    isPrime: boolean;
    socketId: string;
    tableIds: Array<string>;
    tenant: string;
    headers?: HeaderInterface;
    userTablesCash: Array<UserCashSchema>;
    unitySessionId?: string;
    isBot: boolean;
    level: string;
    token: string;
    profitLoss: number;
}
interface HeaderInterface {
    [key: string]: any;
}
export interface authData {
    userAuthToken: string;
    lobbyId: number;
    sessionId?: string;
}
export interface authDataResponse {
    isAuthentic: boolean;
    userId: number;
    canPlayAgain: boolean;
    requestId: string;
    isSuccess: boolean;
    wallet: Wallet;
    error: any;
}
interface Wallet {
    totalCashBalance: string;
    ticketBalance: string;
    bonusBalance: string;
    depositBalance: string;
    winningsBalance: string;
}
export interface VerifyPlayerEligibilityReq {
    userId: number;
    lobbyId: number;
    activeTableDetails: ActiveTableDetails;
    flowType: string;
    cgsClusterName: string;
}
interface ActiveTableDetails {
    activeTableId: string;
    activeTablePresent: boolean;
}
export interface UserCashSchema {
    tableId: string;
    userCash: number;
    isFinishSessionDone?: boolean;
}
export {};
