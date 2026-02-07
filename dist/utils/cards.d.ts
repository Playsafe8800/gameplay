import _ from 'underscore';
import { splitArrayInterface } from '../objectModels';
declare class Cards {
    /**
     * @deprecated
     */
    groupCardsOnMeld(cards: Array<Array<string>>, trumpCard: string): {
        meld: string[];
        score: number;
    };
    /**
     * @deprecated
     */
    checkScore(cards: Array<string>, trumpCard: string): number;
    /**
     * @deprecated
     */
    checkCardScore(card: string, trumpCard: string): number;
    /**
     * @deprecated
     */
    checkForSets(split: splitArrayInterface): boolean;
    /**
     * @deprecated
     */
    checkForPureSequence(split: splitArrayInterface): boolean;
    /**
     * @deprecated
     */
    splitCardArray(cards: Array<string>): splitArrayInterface;
    /**
     *
     * @param expects sorted array of values which can be casted as numbers
     * @deprecated
     */
    checkSequentialForPureSequence(nums: Array<any>): boolean;
    removeCardFromDeck(cards: Array<string>, card: string): string[];
    removePickCardFromGroupingCards(cards: Array<Array<string>>, card: string): string[][];
    sequenceCount(meld: Array<string>): _.Dictionary<number>;
    /**
     *
     * @param meld
     * @returns
     */
    areSequencesValid(meld: Array<string>): boolean;
}
export declare const cardUtils: Cards;
export {};
