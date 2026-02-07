import { PlayerGameplay } from '../objectModels/playerGameplay';
export interface TableStartData {
    tableId: string;
}
export interface addbotI {
    tableId: string;
    currentRound: number;
}
export interface addbotTurnI {
    tableId: string;
    userId: number;
    botTurnCount: number;
}
export declare enum BOT_WIN_STATE {
    NO = "NO",
    WIN = "WIN",
    LOST = "LOST",
    DROP = "DROP"
}
export interface addbotThrowI {
    tableId: string;
    userId: number;
}
export interface addbotFinishI {
    tableId: string;
    userId: number;
    group: Array<Array<string>>;
}
export interface InitialTurnSetup {
    tableId: string;
    roundNumber: number;
    nextTurn: number;
    userIds: Array<number>;
}
export interface PlayerTurnTimerData {
    tableId: string;
    userId: number;
}
export interface FinishTimer {
    tableId: string;
    currentRound: number;
    userIds: Array<number>;
}
export interface PlayMoreInterface {
    tableId: string;
    currentRound: number;
    playingPlayers: Array<PlayerGameplay | null>;
    grpcResponse: any;
}
