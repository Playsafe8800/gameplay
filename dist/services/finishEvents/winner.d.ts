import { PlayerGameplay, UserProfile } from '../../objectModels';
declare class Winner {
    handleWinner(playerGameplayData: any, tableData: any, tableGameplayData: any): Promise<void>;
    clamp(num: number, min: number, max: number): number;
    handleRoundWinner(tableId: string): Promise<void>;
    updateRoundEndHistory(scoreboardData: any[], currentRound: number, grpcResponse: any, tableId: string, trumpCard: string, closedDeck: Array<string>, openTopCard: string): Promise<void>;
    isRejoinPossible(currPlayer: PlayerGameplay, playingPlayers: any[], tableData: any): boolean;
    calcMinCardsPoints: (playersGameData: any[]) => {
        minimumPoints: number;
        minPointPlayerGameData: any;
    };
    isFinalRound(playingPlayers: (PlayerGameplay | null)[], currentRound: number, dealsCount: number): boolean;
    grpcCallForRoundFinish(tableData: any, tableGameData: any, playersGameData: Array<any | null>, minPointPlayerGameData: any, isFinalRound: boolean, histData: Array<PlayerGameplay | null>, playersInfoData: any[]): Promise<any>;
    showScoreboard(tableId: string, currentRound: number, grpcResponse: any, isPointsRummy?: boolean): Promise<void>;
    handleRoundFinish(tableId: string, winnerData: any, currentRound: number, finalDataGrpc: any): Promise<true | undefined>;
    setupNextRound(tableInfo: any, eliminatedPlayers: any[], usersInfo: Array<UserProfile | null>, finalDataGrpc: any, winnerIsColluder: boolean | undefined, activePlayers: any, winData: any): Promise<void>;
    handleRoundTimerExpired(data: {
        nextRoundTimer: number;
        tableId: string;
        currentRound: number;
        eliminatedPlayers: any;
        isTableRejoinable: boolean;
    }): Promise<void>;
}
export declare const winner: Winner;
export {};
