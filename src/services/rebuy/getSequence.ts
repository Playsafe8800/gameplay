import { NUMERICAL } from '../../constants';
type Card = {
  suit: string;
  rank: number;
};
class Deck {
  public cards: string[];
  constructor(cards: string[]) {
    this.cards = cards;
  }
  public getAllCards(): Card[] {
    return this.cards.map((card) => this.parseCard(card));
  }
  private parseCard(card: string): Card {
    const [suit, rank] = card.split('-');
    return { suit, rank: parseInt(rank) };
  }
}
export default class ValidSequence {
  private closedDeck: Deck;
  private oldClosedDeck: string[];
  private suits: { [key: string]: number[] } = {
    H: [],
    S: [],
    D: [],
    C: [],
    J: [],
  };
  private trumpCard: string;
  private forWinner: boolean;
  constructor(
    closedDeck: string[],
    trumpCard: string,
    forWinner = false,
  ) {
    this.closedDeck = new Deck(closedDeck);
    this.oldClosedDeck = [...closedDeck];
    this.trumpCard = trumpCard;
    this.forWinner = forWinner;
    this.initializeSuits();
  }
  private initializeSuits(): void {
    const allCards = this.closedDeck.getAllCards();
    allCards.forEach((card) => {
      this.suits[card.suit].push(card.rank);
    });
    Object.keys(this.suits).forEach((suit) => {
      this.suits[suit].sort((a, b) => a - b);
    });
  }

  private findSequences(arr: number[]): number[][] {
    const sequences: number[][] = [];
    let currentSequence: number[] = [];
    const bunchSize = 3;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === arr[i + 1] - 1) {
        if (currentSequence.length < bunchSize) {
          currentSequence.push(arr[i]);
        } else {
          sequences.push(currentSequence);
          currentSequence = [];
          currentSequence.push(arr[i]);
        }
      } else {
        currentSequence.push(arr[i]);
        sequences.push(currentSequence);
        currentSequence = [];
      }
    }
    return sequences;
  }

  private getTrumpCard(): string {
    const [trumpSuit, trumpRank] = this.trumpCard.split('-');
    const closedDeckCards = this.closedDeck.getAllCards();
    const matchingCardIndex = closedDeckCards.findIndex(
      (card) => card.rank.toString() === trumpRank,
    );
    if (matchingCardIndex !== -1) {
      const matchingCard = closedDeckCards[matchingCardIndex];
      this.closedDeck.cards.splice(matchingCardIndex, 1); // Remove the matching card from the closed deck
      return `${matchingCard.suit}-${matchingCard.rank}-0`;
    } else {
      return this.trumpCard; // Return the original trump card if no match found
    }
  }
  private getRandomSubarrays(inputArray: string[][]): string[][] {
    const result: string[][] = [];
    const fourCards = inputArray.filter((e) => e.length === 4);
    let fourLengthArrayIncluded = false;

    for (let i = 0; i < 200; ++i) {
      if (result.length === 4) break;
      if (!fourLengthArrayIncluded) {
        const randomIndex = Math.floor(
          Math.random() * fourCards.length,
        );
        result.push(fourCards[randomIndex]);
        fourLengthArrayIncluded = true;
      } else {
        const randomIndex = Math.floor(
          Math.random() * inputArray.length,
        );
        const subArray = inputArray[randomIndex];

        if (subArray.length === 4) {
          if (fourLengthArrayIncluded) continue;
          fourLengthArrayIncluded = true;
        }

        result.push(subArray);
        inputArray.splice(randomIndex, 1);
      }
    }
    return result;
  }

  public botGroupCards() {
    const validSequences: string[][] = [];
    const finalDeadWood: string[][] = [];

    Object.keys(this.suits).forEach((suit) => {
      const sequences = this.findSequences(this.suits[suit]);
      const deadWood: string[][] = [];
      sequences.forEach((seq) => {
        if (seq.length === 4) {
          validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
        } else if (seq.length == 3) {
          validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
        } else {
          deadWood.push(seq.map((rank) => `${suit}-${rank}-0`));
        }
      });

      if (deadWood.length) finalDeadWood.push(deadWood.flat());
    });

    return {
      selectedCards: [...validSequences, ...finalDeadWood],
    };
  }
  public getRandomValidSequences() {
    const validSequences: string[][] = [];
    const twoSeq: string[][] = [];
    let isFourMissing = true;
    let totalSeq = 0;

    Object.keys(this.suits).forEach((suit) => {
      const sequences = this.findSequences(this.suits[suit]);
      sequences.forEach((seq) => {
        if (this.forWinner) {
          if (seq.length === 4 && isFourMissing) {
            isFourMissing = false;
            validSequences.push(
              seq.map((rank) => `${suit}-${rank}-0`),
            );
            totalSeq += 1;
          } else if (seq.length == 3) {
            validSequences.push(
              seq.map((rank) => `${suit}-${rank}-0`),
            );
            totalSeq += 1;
          } else if (seq.length == 2) {
            twoSeq.push(seq.map((rank) => `${suit}-${rank}-0`));
          } else if (seq.length > 4) {
            if (isFourMissing) {
              isFourMissing = false;
              validSequences.push(
                seq.slice(0, 4).map((rank) => `${suit}-${rank}-0`),
              );
              totalSeq += 1;
            } else {
              validSequences.push(
                seq.slice(0, 3).map((rank) => `${suit}-${rank}-0`),
              );
              totalSeq += 1;
            }
          }
        } else {
          if (seq.length === 4 && isFourMissing) {
            validSequences.push(
              seq.map((rank) => `${suit}-${rank}-0`),
            );
            totalSeq += 1;
          } else if (seq.length == 3) {
            validSequences.push(
              seq.map((rank) => `${suit}-${rank}-0`),
            );
            totalSeq += 1;
          } else if (seq.length == 2) {
            twoSeq.push(seq.map((rank) => `${suit}-${rank}-0`));
          } else if (seq.length > 4) {
            if (isFourMissing) {
              validSequences.push(
                seq.slice(0, 4).map((rank) => `${suit}-${rank}-0`),
              );
              totalSeq += 1;
            } else {
              validSequences.push(
                seq.slice(0, 3).map((rank) => `${suit}-${rank}-0`),
              );
              totalSeq += 1;
            }
          }
        }
      });
    });
    const removeCardsFromDeck = (sequence: string[][]) => {
      sequence.forEach((seq) => {
        seq.forEach((card) => {
          const index = this.closedDeck.cards.indexOf(card);
          if (index !== -1) {
            this.closedDeck.cards.splice(index, 1);
          }
        });
      });
    };
    // Remove validSequences and twoSeq from the deck
    removeCardsFromDeck(validSequences);
    removeCardsFromDeck(twoSeq);
    let groupCards = validSequences;
    const finalCards = validSequences.flat();
    if (finalCards.length !== NUMERICAL.FOURTEEN) {
      if (isFourMissing && this.forWinner && groupCards[0])
        this.closedDeck['cards'].includes('J-1-0')
          ? groupCards[0].push('J-1-0')
          : groupCards[0].push(this.getTrumpCard());
      if (totalSeq !== 4) {
        const seq: string[][] = [];
        for (let i = 0; i < twoSeq.length; i++) {
          seq.push([...twoSeq[i], this.getTrumpCard()]);
          totalSeq += 1;
          if (totalSeq === 4) break;
        }
        groupCards = groupCards.concat(seq);
      }
    }
    groupCards = this.getRandomSubarrays(groupCards);
    return {
      selectedCards: groupCards,
    };
  }

  public getPureImpureSeq() {
    const validSequences: string[][] = [];
    const twoSeq: string[][] = [];
    let isFourMissing = true;
    let totalSeq = 0;

    Object.keys(this.suits).forEach((suit) => {
      const sequences = this.findSequences(this.suits[suit]);
      sequences.forEach((seq) => {
        if (seq.length === 4 && isFourMissing) {
          isFourMissing = false;
          validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
          totalSeq += 1;
        } else if (seq.length == 3) {
          validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
          totalSeq += 1;
        } else if (seq.length == 2) {
          twoSeq.push(seq.map((rank) => `${suit}-${rank}-0`));
        } else if (seq.length > 4) {
          if (isFourMissing) {
            isFourMissing = false;
            validSequences.push(
              seq.slice(0, 4).map((rank) => `${suit}-${rank}-0`),
            );
            totalSeq += 1;
          } else {
            validSequences.push(
              seq.slice(0, 3).map((rank) => `${suit}-${rank}-0`),
            );
            totalSeq += 1;
          }
        }
      });
    });
    const removeCardsFromDeck = (sequence: string[][]) => {
      sequence.forEach((seq) => {
        seq.forEach((card) => {
          const index = this.closedDeck.cards.indexOf(card);
          if (index !== -1) {
            this.closedDeck.cards.splice(index, 1);
          }
        });
      });
    };
    // Remove validSequences and twoSeq from the deck
    removeCardsFromDeck(validSequences);
    removeCardsFromDeck(twoSeq);
    const groupCards = validSequences;
    const finalCards = validSequences.flat();
    const impureSeq: string[][] = [];
    if (finalCards.length !== NUMERICAL.FOURTEEN) {
      if (isFourMissing && this.forWinner)
        this.closedDeck['cards'].includes('J-1-0')
          ? groupCards[0].push('J-1-0')
          : groupCards[0].push(this.getTrumpCard());
      if (totalSeq !== 4) {
        const seq: string[][] = [];
        for (let i = 0; i < twoSeq.length; i++) {
          seq.push([...twoSeq[i], this.getTrumpCard()]);
          totalSeq += 1;
          if (totalSeq === 4) break;
        }
        impureSeq.push(...seq);
      }
    }
    return {
      pureSeq: groupCards,
      impureSeq: impureSeq,
      closedDeck: this.closedDeck.cards,
      oldClosedDeck: this.oldClosedDeck,
    };
  }
}
// const validSequences = new ValidSequence(
//   [
//     'S-6-0',
//     'D-13-0',
//     'H-7-0',
//     'S-13-0',
//     'C-13-0',
//     'H-5-0',
//     'S-8-0',
//     'C-2-0',
//     'S-7-0',
//     'D-6-0',
//     'C-9-0',
//     'H-3-0',
//     'H-2-0',
//     'C-3-0',
//     'J-1-0',
//     'D-4-0',
//     'H-8-0',
//     'S-1-0',
//     'C-6-0',
//     'S-3-0',
//     'H-13-0',
//     'S-5-0',
//     'C-10-0',
//     'C-5-0',
//     'S-11-0',
//     'S-9-0',
//     'S-4-0',
//   ],
//   'H-9-0',
// );
// const { selectedCards } = validSequences.getRandomValidSequences();
// console.log(selectedCards, '---selectedCards---randomClosedCard-');
