declare class DefaultData {
    getTableGameplayData(oldTableGameplayData: any): {
        _id: string;
        closedDeck: never[];
        currentTurn: number;
        declarePlayer: number;
        potValue: any;
        opendDeck: never[];
        seats: never[];
        tableState: any;
        trumpCard: string;
        dealerPlayer: number;
        splitCount: number;
        pointsForRoundWinner: number;
        splitUserId: number;
        tie: boolean;
        totalPlayerPoints: any;
        turnCount: number;
        tableCurrentTimer: any;
        finishPlayer: never[];
        randomWinTurn: number;
        botWinningChecked: boolean;
        botTurnCount: number;
        noOfPlayers: any;
        rebuyableUsers: any;
        isRebuyable: boolean;
        standupUsers: any;
    };
    defaultFinishBattleResData(grpcReqData: any): {
        playersData: any;
        isSuccess: boolean;
        error: null;
        battlePlayAgainDisabled: boolean;
        collusionInfo: null;
        isFinalRound: boolean;
    };
}
declare const defaultData: DefaultData;
export = defaultData;
