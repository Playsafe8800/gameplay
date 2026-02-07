declare class PlayMore {
    send(userId: number, tableId: string): Promise<void>;
    checkPlayAgainAndUpsellData(tableId: string, tableInfo: any, players: any[], finalDataGrpc: any, tableConfigData: any): Promise<void>;
    sendPlayMoreEventToAllPlayers(tableId: string, tableInfo: any, playerData: any[], tableConfigData: any, iteration: number): Promise<void>;
}
declare const _default: PlayMore;
export = _default;
