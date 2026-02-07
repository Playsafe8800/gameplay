import { networkParams } from '../../objectModels/playerGameplay';
import { TableConfigFinishGame } from '../../objectModels/tableconfiguration';
import { SeatSchema } from '../../objectModels/tableGameplay';
declare class FinishGame {
    finishGame(meld: Array<string>, tableId: string, userId: number, group: Array<Array<string>>, networkParams?: networkParams): Promise<void>;
    /**
     * send room event with player data to show declaring scoreboard
     */
    showRoundDeclaredScoreBoard(tableId: string, seats: Array<SeatSchema>, playersGameData: Array<any>, wildCard?: string): Promise<void>;
    helperAllPlayersFinished(tableInfo: TableConfigFinishGame, tableGamePlay: any, playerList: any[], declarePlayerInfo: any, playerGamePlay: any, userObjectId: number, currentRound: number): Promise<true | void>;
    handleOtherPlayers(tableInfo: TableConfigFinishGame, playerInfo: any[], playerGamePlay: any, currentRound: number, tableGamePlay: any): Promise<void>;
    setFinishAfter(userIdArray: number[], tableId: string, currentRound: number): Promise<boolean>;
    finishRound(data: any, socket: any, networkParams: networkParams): Promise<{
        tableId: any;
        score: number;
        meld: import("../../objectModels").MeldLabel[];
        group: any;
        isValid: boolean;
    } | undefined>;
}
export declare const finishGame: FinishGame;
export {};
