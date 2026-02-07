import { GameTableInfo as GameTableInfoInterface, PlayerInfoSchema, UserProfile } from '../../objectModels';
declare class GameTableInfo {
    formatGameTableInfo(tableConfigData: any, tableGamePlayData: any, userProfileData: UserProfile[], playerGameplayData: Array<any | null>, currentPlayer: any | null, turnHistorydata?: {
        lastPickCard: string;
    }): GameTableInfoInterface;
    getPlayerInfo(playerGameplayData: Array<any | null>, userProfileData: Array<UserProfile>, maximumPoints: number, tableGamePlayData: any, gameType: string, tableId: string, maximumSeat: number): Array<PlayerInfoSchema>;
    getTableInfo(payload: {
        tableId: string;
    }): Promise<any>;
}
declare const gameTableInfo: GameTableInfo;
export = gameTableInfo;
