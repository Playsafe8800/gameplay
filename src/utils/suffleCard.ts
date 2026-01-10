/**
 * @param cards
 * @returns
 */
export function shuffleCards(cards: string[]) {
  const shuffle: Array<string> = [];
  while (cards.length > 0) {
    const randomNumber = Math.floor(Math.random() * cards.length);
    shuffle.push(cards[randomNumber]);
    cards.splice(randomNumber, 1);
  }
  return shuffle;
}
