import _ from 'underscore';
import { NUMERICAL } from '../constants/numerical';
import { MELD, splitArrayInterface } from '../objectModels';

class Cards {
  /**
   * @deprecated
   */
  groupCardsOnMeld(cards: Array<Array<string>>, trumpCard: string) {
    const meld: Array<string> = [];
    let score = 0;
    cards.forEach((currentCards) => {
      currentCards.sort();
      if (currentCards.length < 3) meld.push(MELD.DWD); //score
      const split = this.splitCardArray(currentCards);
      // const {family, deck, card} = split;
      // check for improper sequence
      if (this.checkForPureSequence(split)) meld.push(MELD.PURE);
      else if (this.checkForSets(split)) meld.push(MELD.SET);
      else {
        score += this.checkScore(currentCards, trumpCard);
        meld.push(MELD.DWD);
      }
    });
    return { meld, score };
  }

  /**
   * @deprecated
   */
  checkScore(cards: Array<string>, trumpCard: string) {
    let score = 0;
    cards.forEach((card) => {
      score += this.checkCardScore(card, trumpCard);
    });
    return score;
  }

  /**
   * @deprecated
   */
  checkCardScore(card: string, trumpCard: string) {
    const splitCard = card.split('-');
    if (splitCard.length < 3)
      throw new Error(`Invalid card card at checkCardScore`);

    if (splitCard[0] === 'J' || trumpCard === card) return 0; // Joker

    if (Number(splitCard[2]) > 10) return 10;

    return Number(splitCard[2]);
  }

  /**
   * @deprecated
   */
  checkForSets(split: splitArrayInterface) {
    /**
     * pls include wild card or joker
     */
    const { deck, card } = split;
    const firstDeck = deck[0];
    const firstCard = card[0];
    const sameDeck = deck.every((v) => v === firstDeck);
    if (!sameDeck) return false;
    const sameCard = card.every((v) => v === firstCard);
    if (!sameCard) return false;
    return true;
  }

  /**
   * @deprecated
   */
  checkForPureSequence(split: splitArrayInterface) {
    const { family, deck, card } = split;
    const firstFamily = family[0];
    const firstDeck = deck[0];
    const sameFamily = family.every((v) => v === firstFamily);

    // check if all cards are from the same family
    if (!sameFamily) return false;

    const sameDeck = deck.every((v) => v === firstDeck);
    // check if they are from the same deck
    if (!sameDeck) return false;
    return this.checkSequentialForPureSequence(card);
  }

  /**
   * @deprecated
   */
  splitCardArray(cards: Array<string>): splitArrayInterface {
    const family: Array<string> = [];
    const deck: Array<string> = [];
    const card: Array<string> = [];
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
  checkSequentialForPureSequence(nums: Array<any>) {
    if (nums.length < 1) return false;
    let firstNum: number = nums[0];
    let startTurn: number = NUMERICAL.ONE;
    // card contains ace
    if (firstNum === NUMERICAL.ONE) {
      // either the second card should be two or last card should be king
      if (
        nums[1] != NUMERICAL.TWO ||
        nums[nums.length - 1] != NUMERICAL.THIRTEEN
      ) {
        return false;
      } else {
        firstNum = nums[1];
        startTurn = NUMERICAL.TWO;
      }
    }
    for (let i = startTurn; i < nums.length; i++) {
      if (firstNum + 1 != nums[i]) return false;
      firstNum = nums[i];
    }
    return true;
  }

  removeCardFromDeck(cards: Array<string>, card: string) {
    cards = _.reject([...cards], (currentCard) => {
      return currentCard === card;
    });
    return cards;
  }

  removePickCardFromGroupingCards(
    cards: Array<Array<string>>,
    card: string,
  ) {
    const finalGrouping: Array<Array<string>> = [];
    cards.forEach((currentCards) => {
      const tempCards = _.reject(currentCards, (currentCard) => {
        return currentCard === card;
      });
      finalGrouping.push(tempCards);
    });
    return finalGrouping;
  }

  sequenceCount(meld: Array<string>) {
    return _.countBy(meld, (currentMeld) => currentMeld);
  }
  /**
   *
   * @param meld
   * @returns
   */
  areSequencesValid(meld: Array<string>) {
    const sequenceCount = this.sequenceCount(meld);
    if (!sequenceCount[MELD.PURE]) sequenceCount[MELD.PURE] = 0;
    if (!sequenceCount[MELD.SEQUENCE])
      sequenceCount[MELD.SEQUENCE] = 0;
    if (
      sequenceCount[MELD.PURE] > NUMERICAL.ZERO &&
      sequenceCount[MELD.PURE] + sequenceCount[MELD.SEQUENCE] >
        NUMERICAL.ONE
    ) {
      return true;
    }
    return false;
  }
}

export const cardUtils = new Cards();
