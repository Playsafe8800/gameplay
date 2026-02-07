import { MeldLabel } from './cards';
export interface TurnHistory {
    history: Array<CurrentRoundTurnHistorySchema>;
}
export interface CurrentRoundTurnHistorySchema {
    roundNo: number;
    roundId: string;
    winnerId: number;
    createdOn: string;
    modifiedOn: string;
    extra_info: string;
    turnsDetails: Array<TurnDetailsSchema>;
    userFinalStateTurnDetails?: TurnDetailsSchema[];
}
export interface TurnDetailsSchema {
    turnNo: number;
    userId: number;
    turnStatus: string;
    startState: string;
    sortedStartState: startEndSchema;
    cardPicked: string;
    cardPickSource: string;
    cardDiscarded: string;
    endState: string;
    sortedEndState: startEndSchema;
    points: number;
    createdOn: string;
    isBot: boolean;
    wildCard: string;
    closedDeck: Array<string>;
    openedDeckTop: string;
}
export interface UpdateTurnDetailsSchema {
    turnNo?: number;
    userId?: number;
    turnStatus?: string;
    startState?: string;
    sortedStartState?: startEndSchema;
    cardPicked?: string;
    cardPickSource?: string;
    cardDiscarded?: string;
    endState?: string;
    sortedEndState?: startEndSchema;
    points?: number;
    createdOn?: string;
    isBot?: boolean;
    wildCard?: string;
    closedDeck?: Array<string>;
    openedDeckTop?: string;
}
export interface startEndSchema {
    pure: Array<Array<string>>;
    seq: Array<Array<string>>;
    set: Array<Array<string>>;
    dwd: Array<Array<string>>;
}
export interface ScoreBoardPlayerInfoData {
    userId: number;
    username: string;
    profilePicture?: string;
    userCash?: number;
    status: string;
    userStatus?: string;
    totalPoints: number;
    points: number;
    meld: MeldLabel[];
    group: string[][];
    isRebuyApplicable?: boolean;
    rank?: number;
    winAmount?: number;
    tenant: string;
    canPlayAgain?: boolean;
}
export interface gameDataKafkaIF {
    timestamp: number;
    key: string;
    payload: {
        tableId: string;
        roundNo: number;
        finalRound: boolean;
        roundId: string;
        gameData: {
            startingUsersCount: number;
            lobbyId: object;
            rummyType: string;
            uniqueId: string;
            gameEndReason: {
                [key: number]: string;
            };
            gameDetails: Array<CurrentRoundTurnHistorySchema>;
        };
    };
}
export interface DataToKafkaIF {
    id: string;
    key: string;
    message: string;
}
