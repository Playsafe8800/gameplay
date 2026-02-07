"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffleCards = void 0;
/**
 * @param cards
 * @returns
 */
function shuffleCards(cards) {
    const shuffle = [];
    while (cards.length > 0) {
        const randomNumber = Math.floor(Math.random() * cards.length);
        shuffle.push(cards[randomNumber]);
        cards.splice(randomNumber, 1);
    }
    return shuffle;
}
exports.shuffleCards = shuffleCards;
