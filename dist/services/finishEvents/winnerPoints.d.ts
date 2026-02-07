declare class WinnerPoints {
    declareWinner(tableId: string): Promise<void>;
    handleWinnerPoints(tableId: string, currentRound: any, declarePlayer: any): Promise<void>;
    updateRoundEndHistoryPoints(scoreboardData: any[], currentRound: number, tableId: string, winnerId: number, trumpCard: string, closedDeck: Array<string>, openTopCard: string): Promise<void>;
    handleRoundFinishPoints(tableId: string, currentRound: number, finalDataGrpc: any): Promise<true | undefined>;
    removeOnLowBalanceAndAutoDebit(tableId: string, currentRound: number, tableConfigData: any, tableGamePlayData: any, playersGameData: any): Promise<void>;
    setupNextRoundPoints(tableId: string): Promise<void>;
}
export declare const winnerPoints: WinnerPoints;
export {};
