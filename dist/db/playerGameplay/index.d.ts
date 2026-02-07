import { networkParams, PlayerGameplay as PlayerGameplayInterface, SeatSchema } from '../../objectModels';
declare class PlayerGameplay {
    constructor();
    getPlayerGameplayKey(userId: number, currentRound: number): string;
    deletePlayerGamePlay(userId: number, tableId: string, currentRound: number): Promise<void>;
    getPlayerGameplay(userId: number, tableId: string, currentRound: number, args: string[]): Promise<any>;
    setPlayerGameplay(userId: number, tableId: string, currentRound: number, pgpData: any): Promise<void>;
    getDefaultPlayerGameplayData(userId: number, seatIndex: number, dealPoint: any, doesRebuy?: boolean, networkParams?: networkParams, tableSessionId?: string): PlayerGameplayInterface;
    updateCardsByRoundId(seats: SeatSchema[], usersCards: string[][], tableId: string, currentRound: number, wildCard: string, maximumPoints: number): Promise<any>;
}
export declare const playerGameplayService: PlayerGameplay;
export {};
