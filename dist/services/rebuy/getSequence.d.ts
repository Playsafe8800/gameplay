export default class ValidSequence {
    private closedDeck;
    private oldClosedDeck;
    private suits;
    private trumpCard;
    private forWinner;
    constructor(closedDeck: string[], trumpCard: string, forWinner?: boolean);
    private initializeSuits;
    private findSequences;
    private getTrumpCard;
    private getRandomSubarrays;
    botGroupCards(): {
        selectedCards: string[][];
    };
    getRandomValidSequences(): {
        selectedCards: string[][];
    };
    getPureImpureSeq(): {
        pureSeq: string[][];
        impureSeq: string[][];
        closedDeck: string[];
        oldClosedDeck: string[];
    };
}
