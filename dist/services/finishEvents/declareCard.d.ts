declare class DeclareCard {
    scheduleFinishTimer(tableData: any, tableGameData: any, playersGameData: any[], forOthers?: boolean): Promise<void>;
    getRandomCardFromDeck(deck: string[]): string;
    groupCardOpponat(currentCard: any, trumpCard: any): string[][];
}
export declare const declareCardEvent: DeclareCard;
export {};
