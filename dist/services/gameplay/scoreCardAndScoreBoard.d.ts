/**
 * get last all rounds player points
 * player scores card
 */
export declare const getLastRoundScoreCard: (data: {
    tableId: string;
}, socket: any) => Promise<{
    tableId: string;
    scoreDataList: any;
} | {
    message: string;
}>;
/**
 * get last round winner score board
 */
export declare const getLastRoundScoreBoard: (data: {
    tableId: string;
    round: number;
}, socket: any) => Promise<import("../../objectModels").RoundScoreBoardDataAckInterface | {
    message: string;
} | null>;
