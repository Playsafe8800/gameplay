import { GameHistoryData } from '../../services/aws';
import { CurrentRoundTurnHistorySchema } from '../../objectModels';
declare class TurnHistory {
    getTurnHistoryKey(tableId: string, roundNumber: number): string;
    getTurnHistory(tableId: string, roundNumber?: number): Promise<CurrentRoundTurnHistorySchema>;
    setTurnHistory(tableId: string, roundNumber: number | undefined, turnHistoryData: CurrentRoundTurnHistorySchema): Promise<void>;
    setGameTurnHistory(tableId: string, turnHistoryData: GameHistoryData): Promise<void>;
    getDefaultTurnHistoryData(tableData: any, tableGameData: any): {
        history: CurrentRoundTurnHistorySchema[];
    };
    getDefaultCurrentRoundTurnHistoryData(tableData: any, tableGameData: any): CurrentRoundTurnHistorySchema;
}
export declare const turnHistoryService: TurnHistory;
export {};
