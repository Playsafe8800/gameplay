import { cardSplitView, DeclareCardRequest, GroupCardsInterface, GroupCardsResponseInterface, MELD, Meld, MeldLabel, SeatSchema, UserTossCardInterface } from '../../objectModels';
import { networkParams } from '../../objectModels/playerGameplay';
declare class CardHandler {
    groupCards(data: GroupCardsInterface, socket: any, networkParams: networkParams): Promise<GroupCardsResponseInterface>;
    labelTheMeld(input: {
        meld: Array<Meld>;
        cardsGroup: Array<Array<string>>;
    }): MeldLabel[];
    groupCardsOnMeld(cards: Array<Array<string>>, trumpCard: string, maximumPoints?: number): {
        meld: MELD[];
        score: number;
        meldLabel: MeldLabel[];
    };
    checkScore(cards: Array<string>, trumpCard: string): number;
    checkCardScore(card: string, trumpCard: number): number;
    checkForSets(splitArray: Array<cardSplitView>, trumpCard: string): boolean;
    checkForPureSequence(split: Array<cardSplitView>): boolean;
    checkForImpureSequence(splitArray: Array<cardSplitView>, trumpCard: string): boolean;
    private checkSeqImpure;
    splitCardsArray(cards: Array<string>): Array<cardSplitView>;
    checkSequentialForPureSequence(nums: Array<number>): boolean;
    initialCardsGrouping(cards: Array<string>): string[][];
    private sortGrouping;
    chooseCardsForDealerToss(seats: SeatSchema[]): Promise<UserTossCardInterface[]>;
    private getHighCard;
    declareCard(data: DeclareCardRequest, socket: any, networkParams: networkParams): Promise<GroupCardsResponseInterface>;
    /**
     * To show all open discarded cards(open deck cards with userIds)
     */
    discardedCards(tableId: string): Promise<any>;
}
export declare const cardHandler: CardHandler;
export {};
