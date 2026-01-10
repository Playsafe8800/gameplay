const SUITS = ['S', 'H', 'C', 'D'];
const RANKS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
];

const SUITS_INDEX = SUITS.reduce((acc, suit, index) => {
  acc[suit] = index;
  return acc;
}, {});
const RANKS_INDEX = RANKS.reduce((acc, rank, index) => {
  acc[rank] = index;
  return acc;
}, {});

function getDeckIndexForCard(
  cardId: number,
  originalHand: { id: number; deckIndex: number }[],
): number {
  const matchIndex = originalHand.findIndex((c) => c.id == cardId);
  const tempVar = originalHand[matchIndex]
  originalHand.splice(matchIndex, 1);
  return tempVar ? tempVar.deckIndex : 0;
}

function getCardId(rank: string, suit: string): number {
  if (suit === 'J') return 52;
  if (!RANKS.includes(rank)) throw new Error('invalid rank');
  if (!SUITS.includes(suit)) throw new Error('invalid suit');
  return RANKS_INDEX[rank] + 13 * SUITS_INDEX[suit];
}

function getCardFromId(
  cardId: number,
  deckIndex: number = 0,
): string {
  if (cardId === 52) return `J-1-${deckIndex}`;
  const suitIndex = Math.floor(cardId / 13);
  const rankIndex = cardId % 13;
  const suit = SUITS[suitIndex];
  const rank = RANKS[rankIndex];
  return `${suit}-${rank}-${deckIndex}`;
}

const parseCard = (card: string): { id: number; deckIndex: number } => {
  const [suit, rank, deck] = card.split("-");
  return {
    id: getCardId(rank, suit),
    deckIndex: parseInt(deck),
  };
};

export function dropInputFormator(
  currentCards: string[],
  wildCard: string,
  openedCard: string
) {
  const hand = currentCards.map(parseCard);

  const [openSuit, openRank, openDeck] = openedCard.split("-");
  const topCard = {
    id: getCardId(openRank, openSuit),
    deckIndex: parseInt(openDeck),
  };

  const wildCardRank = wildCard.split("-")[1];
  const jokerRank = RANKS_INDEX[wildCardRank];

  return { hand, jokerRank, topCard };
}

export function dropOutPutFormator(
  dropOutput: DropOutput,
  originalHand: { id: number; deckIndex: number }[]
) {
  const { should_drop, arrangement } = dropOutput;

  const groupCards = arrangement
    .filter((subArr) => subArr[0].length > 0)
    .map((subArr) => {
      return subArr[0].map((cardId) => {
        const deckIndex = getDeckIndexForCard(cardId, originalHand);
        return getCardFromId(cardId, deckIndex);
      });
    });

  return { shouldDrop: should_drop, groupCards };
}

export function pickInputFormator(
  currentCards: string[],
  openedCard: string,
  wildCard: string
) {
  const hand = currentCards.map(parseCard);

  const [openSuit, openRank, openDeck] = openedCard.split("-");
  const topCard = {
    id: getCardId(openRank, openSuit),
    deckIndex: parseInt(openDeck),
  };

  return {
    hand,
    topCard,
    jokerRank: RANKS_INDEX[wildCard.split("-")[1]],
  };
}

export function throwInputFormator(
  currentCards: string[],
  wildCard: string,
  opendDeck: string[],
  rejectedCards?: string[],
  pickedCards?: string[],
): any {
  const hand = currentCards.map((card) => {
    const [suit, rank, deck] = card.split('-');
    return { id: getCardId(rank, suit), deckIndex: parseInt(deck) };
  });
  const p_array = opendDeck.map((card) => {
    const [suit, rank, deck] = card.split('-');
    return { id: getCardId(rank, suit), deckIndex: parseInt(deck) };
  });
  const result: any = {
    hand: hand,
    jokerRank: RANKS_INDEX[wildCard.split('-')[1]],
    p_array: p_array,
  };
  if (rejectedCards && pickedCards) {
    result.rejectedCards = rejectedCards.map((card) => {
      const [suit, rank, deck] = card.split('-');
      return { id: getCardId(rank, suit), deckIndex: parseInt(deck) };
    });
    result.pickedCards = pickedCards.map((card) => {
      const [suit, rank, deck] = card.split('-');
      return { id: getCardId(rank, suit), deckIndex: parseInt(deck) };
    });
  }
  return result;
}

export function throwOutPutFormator(
  throwOutput: ThrowOutput,
  originalHand: { id: number; deckIndex: number }[],
) {
  const { card_to_throw, arrangement } = throwOutput;

  const groupCards = arrangement
    .filter((subArr) => subArr[0].length > 0)
    .map((subArr) => {
      return subArr[0].map((cardId) => {
        const deckIndex = getDeckIndexForCard(cardId, originalHand);
        return getCardFromId(cardId, deckIndex);
      });
    });
  const thrownDeckIndex = getDeckIndexForCard(
    card_to_throw,
    originalHand,
  );
  return {
    thrownCard: getCardFromId(card_to_throw, thrownDeckIndex),
    groupCards,
  };
}

interface ThrowOutput {
  card_to_throw: number;
  arrangement: any;
}

interface DropOutput {
  should_drop: boolean;
  arrangement: any;
}
