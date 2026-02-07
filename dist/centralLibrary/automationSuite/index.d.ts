interface distributedCardsIF {
    usersCards: Array<Array<string>>;
    wildCard: string;
    firstOpenCard: Array<string>;
    shuffledDeck: Array<string>;
}
export declare class AutomationSuite {
    distributeCardsForAutomationSuite(gameType: any, playersData: any): Promise<distributedCardsIF | void>;
    generateNormalizedUserList(playersData: any): string;
}
export {};
