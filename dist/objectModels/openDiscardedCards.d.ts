export interface OpenDiscardedCards {
    openCards: Array<DiscardedCardsSchema>;
}
export interface DiscardedCardsSchema {
    userId: number;
    card: string;
}
