declare class UserService {
    findOrCreateUser(userId: number, socketId: string, socketHeaders: object, appType: string, unitySessionId?: string): Promise<import("../../objectModels").UserProfile>;
    debitValidation(tableId: string, lobbyId: number, newUserId: number): Promise<void>;
    getUserBalance(userId: number, socket: any, token: string, ack?: any): Promise<{
        depositBalance: any;
        bonusBalance: any;
        winningBalance: any;
        withDrawableBalance: any;
        pointsWalletBalance: number;
        totalBalance: any;
        totalDummyBalance: number;
        success: boolean;
    } | {
        success: boolean;
        error: unknown;
    } | undefined>;
}
export declare const userService: UserService;
export {};
