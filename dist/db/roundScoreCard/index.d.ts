declare class RoundScoreCard {
    constructor();
    getRoundScoreCardKey(tableId: string): string;
    getRoundScoreCard(tableId: string): Promise<any>;
    setRoundScoreCard(tableId: string, lastRoundScoreCardData: any): Promise<void>;
}
export declare const roundScoreCardService: RoundScoreCard;
export {};
