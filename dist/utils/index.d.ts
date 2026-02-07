import { CurrentRoundTurnHistorySchema, EliminatedPlayerDataSchema, GroupingSchema, PlayerGameplay } from '../objectModels';
export declare function getMaxRejoinPoints(tableConfigData: any): number | undefined;
export declare const rankSortComparator: (a: any, b: any) => number;
export declare function setFinishDataForPlayers(players: PlayerGameplay[], finishGrpc: any): EliminatedPlayerDataSchema[];
export declare function deductScoreForDeals(playerData: any, tableGamePlayData: any, points: number): void;
export declare function getIdPrefix(GAME_TYPE?: string): string | undefined;
export declare function getGameId(GAME_TYPE: string): number | undefined;
export declare function roundInt(nmbr: number, decimalCount: number): number;
export declare function flattenObject(obj: Record<string, any>): {};
export declare function getRandomTableId(): string;
/**
 * remove pick card from grouping cards and send updated grouping cards
 * @param {string} removeCard
 * @param {GroupingSchema} groupCards
 * @returns {GroupingSchema}
 * @deprecated
 */
export declare function removePickCardFromGroupingCards(removeCard: string, groupCards: GroupingSchema): GroupingSchema;
export declare function removePickCardFromCards(removeCard: string, groupCards: Array<Array<string>>): Array<Array<string>>;
export declare function issGroupingCardAndCurrentCardSame(currentCards: Array<string>, groupCards: Array<Array<string>>): boolean;
/**
 * Gets the drop points as per first or middle drop
 * @param {Boolean} isFirstTurn
 * @param {number} maxPoints
 * @returns {Number}
 */
export declare function getDropPoints(isFirstTurn: boolean, maxPoints: number, gameType: string, playerCount: number): number;
export declare function getDropStatus(points: number, isAutoDrop: boolean): string;
export declare function isGameTie(playersGameData: (PlayerGameplay | null)[]): boolean;
export declare function getFormat(gameFormat?: string): string;
export declare function getFormatV2(gameFormat: string): string;
export declare function getBootValue(value: number, currencyType: string): number;
export declare function getWinnings(bootValue: number, rank: number, noOfPlayers: number, currencyType: string, winnings: number): number;
export declare function removeEmptyString(str: string): string;
export declare function isPointsRummyFormat(gameType: string): boolean;
export declare function formatGameDetails(currentRound: number, tableGamePlayData: any, currentRoundHistory: any, winnerId?: number): CurrentRoundTurnHistorySchema[];
export declare function sendAutoDebitInfo(payload: {
    socketId: string;
    tableId: string;
    userId: number;
    amount: number;
}): void;
export declare function updateUserCash(playerGamePlayData: any, tableId: string, currentRound: number, userCashAmount: number, gamePlaytext: string, playerData: any, option?: {
    isAddCashUpdate?: boolean;
    autodebitAmount?: number;
}): Promise<any>;
export declare function setUserCash(tableId: string, userCashAmount: number, gamePlaytext: string, playerData: any, isNewUI: boolean): Promise<number>;
export declare function getRoundEndReason(playerGameplay: PlayerGameplay, winnerId: number): string;
export declare function getBot(lobbyAmount: any): any;
