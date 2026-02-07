import { TableStartData, UserProfile } from '../../objectModels';
import { networkParams } from '../../objectModels/playerGameplay';
declare class TableOperation {
    addInTable(socket: any, tableConfigurationData: any, userData: UserProfile, retries?: number, networkParams?: networkParams, tableSessionId?: string, fromSQS?: boolean): any;
    private checkBeforeStartRound;
    createTable(tableConfigData: any): Promise<string>;
    getAvailableTable(key: string, userData: UserProfile, maximumSeat: number, gameType: string): Promise<string>;
    setupRound(tableId: string, roundNumber: number, tableConfigurationData: any, oldTableGamePlayData: any): Promise<[void, void]>;
    insertNewPlayer(socket: any, userData: UserProfile, tableConfigurationData: any, startRoundTimer: boolean, networkParams?: networkParams, tableSessionId?: string): Promise<any>;
    insertPlayerInTable(userData: UserProfile, tableConfigData: any, oldPlayerGameplayData?: any, networkParams?: networkParams, tableSessionId?: string): Promise<{
        playerGameplayData: import("../../objectModels").PlayerGameplay;
        updatedTableGameplayData: any;
    }>;
    insertPlayerInSeat(seats: any[], userObjectId: number, isBot: boolean): number;
    updateTableConfigRoundNumber(tableConfigurationData: any, currentRound: number): Promise<void>;
    insertTableGamePlay(tableGameplayData: any, tableId: string, roundNumber: number): Promise<void>;
    addPlayerInTable(socket: any, data: {
        usersData: any;
        tableId: string;
        maximumSeat: number;
    }): Promise<void>;
    initializeGameplayForFirstRound(data: TableStartData): Promise<void>;
}
export declare const tableOperation: TableOperation;
export {};
