import { RoundScoreBoardDataAckInterface } from '../../objectModels';
declare class RoundScoreBoard {
    constructor();
    getRoundScoreBoardKey(tableId: string, roundNo: number): string;
    getRoundScoreBoard(tableId: string, roundNo?: number): Promise<RoundScoreBoardDataAckInterface | null>;
    setRoundScoreBoard(tableId: string, roundNo: number, lastRoundScoreBoardData: any): Promise<void>;
    deleteRoundScoreBoard(tableId: string, roundNo: number): Promise<void>;
}
export declare const roundScoreBoardService: RoundScoreBoard;
export {};
