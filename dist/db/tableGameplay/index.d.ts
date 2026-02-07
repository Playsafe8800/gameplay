import { SplitInfo } from '../../objectModels';
import { OpenDiscardedCards } from '../../objectModels/openDiscardedCards';
declare class TableGameplay {
    private getTableGameplayKey;
    private getOpenDiscardedCardKey;
    getTableGameplay(tableId: string, currentRound: number, args: string[]): Promise<any>;
    setTableGameplay(tableId: string, currentRound: number, tableGameplayData: any): Promise<void>;
    deleteTableGameplay(tableId: string, currentRound: number): Promise<void>;
    private getSplitRequestKey;
    getSplitRequest(tableId: string): Promise<unknown>;
    updateSplitRequest(tableId: string, updatedSplitData: SplitInfo): Promise<any>;
    deleteSplitRequest(tableId: string): Promise<void>;
    getOpenDiscardedCards(tableId: string, currentRound: number): Promise<OpenDiscardedCards | null>;
    setOpenDiscardedCards(tableId: string, currentRound: number, OpenDiscardedCardsData: OpenDiscardedCards): Promise<void>;
}
export declare const tableGameplayService: TableGameplay;
export {};
