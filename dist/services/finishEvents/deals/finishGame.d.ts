import { networkParams } from '../../../objectModels';
declare class FinishGame {
    finishGame(meld: Array<string>, tableId: string, userId: number, group: Array<Array<string>>, networkParams?: networkParams): Promise<void>;
    private getCurrentPlayerGameData;
    private handleFinish;
    private helperAllPlayersFinished;
    handleOtherPlayers(tableInfo: any, playerInfo: any[], playerGamePlay: any, currentRound: number, tableGamePlay: any): Promise<void>;
}
export declare const finishGameDeals: FinishGame;
export {};
