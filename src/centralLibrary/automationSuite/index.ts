import { Logger } from '../../newLogger';
import fs from 'fs';

interface cardDataIF {
  usersCards: { [key: string]: Array<string> };
  wildCard: string;
  firstOpenCard: Array<string>;
  shuffledDeck: Array<string>;
}

interface distributedCardsIF {
  usersCards: Array<Array<string>>;
  wildCard: string;
  firstOpenCard: Array<string>;
  shuffledDeck: Array<string>;
}

export class AutomationSuite {
  async distributeCardsForAutomationSuite(
    gameType: any,
    playersData: any,
  ): Promise<distributedCardsIF | void> {
    Logger.info('Distributing cards from cardsToBeDealt.json');
    const usersCards: Array<Array<string>> = [];
    let cardData: cardDataIF;

    // playerIds -> [123, 456] (sorted order)
    // normalizedString will be of the following format "123,456,"
    const testCaseKey = this.generateNormalizedUserList(playersData);

    return new Promise<distributedCardsIF>(
      (
        resolve: (
          value: distributedCardsIF | PromiseLike<distributedCardsIF>,
        ) => void,
        reject: (reason?: any) => void,
      ) => {
        fs.readFile('./cardsToBeDealt.json', (error, data) => {
          if (error) {
            reject(`Error reading cards from JSON file: ${error}`);
          }
          const cardDataJSON = JSON.parse(data.toString());
          Logger.info('GameType: ', gameType);
          Logger.info('testCaseKey: ', testCaseKey);
          cardData = cardDataJSON[`${gameType}`][`${testCaseKey}`];
          Logger.info('Dealing the cards: ', cardData);

          // setting cards for each player
          for (let i = 0; i < playersData.length; ++i) {
            const playerId = playersData[i].id;
            usersCards.push(cardData.usersCards[`${playerId}`]);
          }

          const distributedCards: distributedCardsIF = {
            usersCards,
            wildCard: cardData.wildCard,
            firstOpenCard: cardData.firstOpenCard,
            shuffledDeck: cardData.shuffledDeck,
          };

          resolve(distributedCards);
        });
      },
    );
  }

  generateNormalizedUserList(playersData: any): string {
    let normalizedString = '';
    const playerIdArray: Array<number> = [];

    playersData.forEach((player: any) => {
      playerIdArray.push(player.id);
    });

    playerIdArray.sort();

    playerIdArray.forEach((id) => {
      normalizedString += `${id},`;
    });
    return normalizedString;
  }
}
