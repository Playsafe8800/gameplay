export declare function dropInputFormator(currentCards: string[], wildCard: string, openedCard: string): {
    hand: {
        id: number;
        deckIndex: number;
    }[];
    jokerRank: any;
    topCard: {
        id: number;
        deckIndex: number;
    };
};
export declare function dropOutPutFormator(dropOutput: DropOutput, originalHand: {
    id: number;
    deckIndex: number;
}[]): {
    shouldDrop: boolean;
    groupCards: any;
};
export declare function pickInputFormator(currentCards: string[], openedCard: string, wildCard: string): {
    hand: {
        id: number;
        deckIndex: number;
    }[];
    topCard: {
        id: number;
        deckIndex: number;
    };
    jokerRank: any;
};
export declare function throwInputFormator(currentCards: string[], wildCard: string, opendDeck: string[], rejectedCards?: string[], pickedCards?: string[]): any;
export declare function throwOutPutFormator(throwOutput: ThrowOutput, originalHand: {
    id: number;
    deckIndex: number;
}[]): {
    thrownCard: string;
    groupCards: any;
};
interface ThrowOutput {
    card_to_throw: number;
    arrangement: any;
}
interface DropOutput {
    should_drop: boolean;
    arrangement: any;
}
export {};
