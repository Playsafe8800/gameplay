"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardUtils = void 0;
const underscore_1 = __importDefault(require("underscore"));
const numerical_1 = require("../constants/numerical");
const objectModels_1 = require("../objectModels");
class Cards {
    /**
     * @deprecated
     */
    groupCardsOnMeld(cards, trumpCard) {
        const meld = [];
        let score = 0;
        cards.forEach((currentCards) => {
            currentCards.sort();
            if (currentCards.length < 3)
                meld.push(objectModels_1.MELD.DWD); //score
            const split = this.splitCardArray(currentCards);
            // const {family, deck, card} = split;
            // check for improper sequence
            if (this.checkForPureSequence(split))
                meld.push(objectModels_1.MELD.PURE);
            else if (this.checkForSets(split))
                meld.push(objectModels_1.MELD.SET);
            else {
                score += this.checkScore(currentCards, trumpCard);
                meld.push(objectModels_1.MELD.DWD);
            }
        });
        return { meld, score };
    }
    /**
     * @deprecated
     */
    checkScore(cards, trumpCard) {
        let score = 0;
        cards.forEach((card) => {
            score += this.checkCardScore(card, trumpCard);
        });
        return score;
    }
    /**
     * @deprecated
     */
    checkCardScore(card, trumpCard) {
        const splitCard = card.split('-');
        if (splitCard.length < 3)
            throw new Error(`Invalid card card at checkCardScore`);
        if (splitCard[0] === 'J' || trumpCard === card)
            return 0; // Joker
        if (Number(splitCard[2]) > 10)
            return 10;
        return Number(splitCard[2]);
    }
    /**
     * @deprecated
     */
    checkForSets(split) {
        /**
         * pls include wild card or joker
         */
        const { deck, card } = split;
        const firstDeck = deck[0];
        const firstCard = card[0];
        const sameDeck = deck.every((v) => v === firstDeck);
        if (!sameDeck)
            return false;
        const sameCard = card.every((v) => v === firstCard);
        if (!sameCard)
            return false;
        return true;
    }
    /**
     * @deprecated
     */
    checkForPureSequence(split) {
        const { family, deck, card } = split;
        const firstFamily = family[0];
        const firstDeck = deck[0];
        const sameFamily = family.every((v) => v === firstFamily);
        // check if all cards are from the same family
        if (!sameFamily)
            return false;
        const sameDeck = deck.every((v) => v === firstDeck);
        // check if they are from the same deck
        if (!sameDeck)
            return false;
        return this.checkSequentialForPureSequence(card);
    }
    /**
     * @deprecated
     */
    splitCardArray(cards) {
        const family = [];
        const deck = [];
        const card = [];
        cards.forEach((currentCard) => {
            const currentSplit = currentCard.split('-');
            if (currentSplit.length < 3)
                throw new Error(`Invalid card sequence in splitCardArray`);
            family.push(currentSplit[0]);
            card.push(currentSplit[1]);
            deck.push(currentSplit[2]);
        });
        return { family, deck, card };
    }
    /**
     *
     * @param expects sorted array of values which can be casted as numbers
     * @deprecated
     */
    checkSequentialForPureSequence(nums) {
        if (nums.length < 1)
            return false;
        let firstNum = nums[0];
        let startTurn = numerical_1.NUMERICAL.ONE;
        // card contains ace
        if (firstNum === numerical_1.NUMERICAL.ONE) {
            // either the second card should be two or last card should be king
            if (nums[1] != numerical_1.NUMERICAL.TWO ||
                nums[nums.length - 1] != numerical_1.NUMERICAL.THIRTEEN) {
                return false;
            }
            else {
                firstNum = nums[1];
                startTurn = numerical_1.NUMERICAL.TWO;
            }
        }
        for (let i = startTurn; i < nums.length; i++) {
            if (firstNum + 1 != nums[i])
                return false;
            firstNum = nums[i];
        }
        return true;
    }
    removeCardFromDeck(cards, card) {
        cards = underscore_1.default.reject([...cards], (currentCard) => {
            return currentCard === card;
        });
        return cards;
    }
    removePickCardFromGroupingCards(cards, card) {
        const finalGrouping = [];
        cards.forEach((currentCards) => {
            const tempCards = underscore_1.default.reject(currentCards, (currentCard) => {
                return currentCard === card;
            });
            finalGrouping.push(tempCards);
        });
        return finalGrouping;
    }
    sequenceCount(meld) {
        return underscore_1.default.countBy(meld, (currentMeld) => currentMeld);
    }
    /**
     *
     * @param meld
     * @returns
     */
    areSequencesValid(meld) {
        const sequenceCount = this.sequenceCount(meld);
        if (!sequenceCount[objectModels_1.MELD.PURE])
            sequenceCount[objectModels_1.MELD.PURE] = 0;
        if (!sequenceCount[objectModels_1.MELD.SEQUENCE])
            sequenceCount[objectModels_1.MELD.SEQUENCE] = 0;
        if (sequenceCount[objectModels_1.MELD.PURE] > numerical_1.NUMERICAL.ZERO &&
            sequenceCount[objectModels_1.MELD.PURE] + sequenceCount[objectModels_1.MELD.SEQUENCE] >
                numerical_1.NUMERICAL.ONE) {
            return true;
        }
        return false;
    }
}
exports.cardUtils = new Cards();
