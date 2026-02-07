"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
class Deck {
    constructor(cards) {
        this.cards = cards;
    }
    getAllCards() {
        return this.cards.map((card) => this.parseCard(card));
    }
    parseCard(card) {
        const [suit, rank] = card.split('-');
        return { suit, rank: parseInt(rank) };
    }
}
class ValidSequence {
    constructor(closedDeck, trumpCard, forWinner = false) {
        this.suits = {
            H: [],
            S: [],
            D: [],
            C: [],
            J: [],
        };
        this.closedDeck = new Deck(closedDeck);
        this.oldClosedDeck = [...closedDeck];
        this.trumpCard = trumpCard;
        this.forWinner = forWinner;
        this.initializeSuits();
    }
    initializeSuits() {
        const allCards = this.closedDeck.getAllCards();
        allCards.forEach((card) => {
            this.suits[card.suit].push(card.rank);
        });
        Object.keys(this.suits).forEach((suit) => {
            this.suits[suit].sort((a, b) => a - b);
        });
    }
    findSequences(arr) {
        const sequences = [];
        let currentSequence = [];
        const bunchSize = 3;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === arr[i + 1] - 1) {
                if (currentSequence.length < bunchSize) {
                    currentSequence.push(arr[i]);
                }
                else {
                    sequences.push(currentSequence);
                    currentSequence = [];
                    currentSequence.push(arr[i]);
                }
            }
            else {
                currentSequence.push(arr[i]);
                sequences.push(currentSequence);
                currentSequence = [];
            }
        }
        return sequences;
    }
    getTrumpCard() {
        const [trumpSuit, trumpRank] = this.trumpCard.split('-');
        const closedDeckCards = this.closedDeck.getAllCards();
        const matchingCardIndex = closedDeckCards.findIndex((card) => card.rank.toString() === trumpRank);
        if (matchingCardIndex !== -1) {
            const matchingCard = closedDeckCards[matchingCardIndex];
            this.closedDeck.cards.splice(matchingCardIndex, 1); // Remove the matching card from the closed deck
            return `${matchingCard.suit}-${matchingCard.rank}-0`;
        }
        else {
            return this.trumpCard; // Return the original trump card if no match found
        }
    }
    getRandomSubarrays(inputArray) {
        const result = [];
        const fourCards = inputArray.filter((e) => e.length === 4);
        let fourLengthArrayIncluded = false;
        for (let i = 0; i < 200; ++i) {
            if (result.length === 4)
                break;
            if (!fourLengthArrayIncluded) {
                const randomIndex = Math.floor(Math.random() * fourCards.length);
                result.push(fourCards[randomIndex]);
                fourLengthArrayIncluded = true;
            }
            else {
                const randomIndex = Math.floor(Math.random() * inputArray.length);
                const subArray = inputArray[randomIndex];
                if (subArray.length === 4) {
                    if (fourLengthArrayIncluded)
                        continue;
                    fourLengthArrayIncluded = true;
                }
                result.push(subArray);
                inputArray.splice(randomIndex, 1);
            }
        }
        return result;
    }
    botGroupCards() {
        const validSequences = [];
        const finalDeadWood = [];
        Object.keys(this.suits).forEach((suit) => {
            const sequences = this.findSequences(this.suits[suit]);
            const deadWood = [];
            sequences.forEach((seq) => {
                if (seq.length === 4) {
                    validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
                }
                else if (seq.length == 3) {
                    validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
                }
                else {
                    deadWood.push(seq.map((rank) => `${suit}-${rank}-0`));
                }
            });
            if (deadWood.length)
                finalDeadWood.push(deadWood.flat());
        });
        return {
            selectedCards: [...validSequences, ...finalDeadWood],
        };
    }
    getRandomValidSequences() {
        const validSequences = [];
        const twoSeq = [];
        let isFourMissing = true;
        let totalSeq = 0;
        Object.keys(this.suits).forEach((suit) => {
            const sequences = this.findSequences(this.suits[suit]);
            sequences.forEach((seq) => {
                if (this.forWinner) {
                    if (seq.length === 4 && isFourMissing) {
                        isFourMissing = false;
                        validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
                        totalSeq += 1;
                    }
                    else if (seq.length == 3) {
                        validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
                        totalSeq += 1;
                    }
                    else if (seq.length == 2) {
                        twoSeq.push(seq.map((rank) => `${suit}-${rank}-0`));
                    }
                    else if (seq.length > 4) {
                        if (isFourMissing) {
                            isFourMissing = false;
                            validSequences.push(seq.slice(0, 4).map((rank) => `${suit}-${rank}-0`));
                            totalSeq += 1;
                        }
                        else {
                            validSequences.push(seq.slice(0, 3).map((rank) => `${suit}-${rank}-0`));
                            totalSeq += 1;
                        }
                    }
                }
                else {
                    if (seq.length === 4 && isFourMissing) {
                        validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
                        totalSeq += 1;
                    }
                    else if (seq.length == 3) {
                        validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
                        totalSeq += 1;
                    }
                    else if (seq.length == 2) {
                        twoSeq.push(seq.map((rank) => `${suit}-${rank}-0`));
                    }
                    else if (seq.length > 4) {
                        if (isFourMissing) {
                            validSequences.push(seq.slice(0, 4).map((rank) => `${suit}-${rank}-0`));
                            totalSeq += 1;
                        }
                        else {
                            validSequences.push(seq.slice(0, 3).map((rank) => `${suit}-${rank}-0`));
                            totalSeq += 1;
                        }
                    }
                }
            });
        });
        const removeCardsFromDeck = (sequence) => {
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
        if (finalCards.length !== constants_1.NUMERICAL.FOURTEEN) {
            if (isFourMissing && this.forWinner && groupCards[0])
                this.closedDeck['cards'].includes('J-1-0')
                    ? groupCards[0].push('J-1-0')
                    : groupCards[0].push(this.getTrumpCard());
            if (totalSeq !== 4) {
                const seq = [];
                for (let i = 0; i < twoSeq.length; i++) {
                    seq.push([...twoSeq[i], this.getTrumpCard()]);
                    totalSeq += 1;
                    if (totalSeq === 4)
                        break;
                }
                groupCards = groupCards.concat(seq);
            }
        }
        groupCards = this.getRandomSubarrays(groupCards);
        return {
            selectedCards: groupCards,
        };
    }
    getPureImpureSeq() {
        const validSequences = [];
        const twoSeq = [];
        let isFourMissing = true;
        let totalSeq = 0;
        Object.keys(this.suits).forEach((suit) => {
            const sequences = this.findSequences(this.suits[suit]);
            sequences.forEach((seq) => {
                if (seq.length === 4 && isFourMissing) {
                    isFourMissing = false;
                    validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
                    totalSeq += 1;
                }
                else if (seq.length == 3) {
                    validSequences.push(seq.map((rank) => `${suit}-${rank}-0`));
                    totalSeq += 1;
                }
                else if (seq.length == 2) {
                    twoSeq.push(seq.map((rank) => `${suit}-${rank}-0`));
                }
                else if (seq.length > 4) {
                    if (isFourMissing) {
                        isFourMissing = false;
                        validSequences.push(seq.slice(0, 4).map((rank) => `${suit}-${rank}-0`));
                        totalSeq += 1;
                    }
                    else {
                        validSequences.push(seq.slice(0, 3).map((rank) => `${suit}-${rank}-0`));
                        totalSeq += 1;
                    }
                }
            });
        });
        const removeCardsFromDeck = (sequence) => {
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
        const impureSeq = [];
        if (finalCards.length !== constants_1.NUMERICAL.FOURTEEN) {
            if (isFourMissing && this.forWinner)
                this.closedDeck['cards'].includes('J-1-0')
                    ? groupCards[0].push('J-1-0')
                    : groupCards[0].push(this.getTrumpCard());
            if (totalSeq !== 4) {
                const seq = [];
                for (let i = 0; i < twoSeq.length; i++) {
                    seq.push([...twoSeq[i], this.getTrumpCard()]);
                    totalSeq += 1;
                    if (totalSeq === 4)
                        break;
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
exports.default = ValidSequence;
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
