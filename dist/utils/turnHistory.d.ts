import { GroupingSchema, TurnHistory, UpdateTurnDetailsSchema, startEndSchema } from '../objectModels';
export declare function getCurrentRoundHistory(history: TurnHistory, currentRound: number): import("../objectModels").CurrentRoundTurnHistorySchema;
export declare function UpdateTurnDetails(tableId: string, currentRound: number, currentTurnData: UpdateTurnDetailsSchema): Promise<void>;
export declare function replaceRoundHistory(history: any, currentRound: number, updatedObj: any): any;
export declare function formatCards(groupingCards: GroupingSchema): string | any[];
export declare function sortedCards(cards: Array<Array<string>>, meld: Array<string>): startEndSchema;
