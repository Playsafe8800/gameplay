import { Logger } from '../../newLogger';
import { PLAYER_STATE, TABLE_PREFIX } from '../../constants';
import { ERROR_CAUSES } from '../../constants/errors';
import {
  networkParams,
  PlayerGameplay as PlayerGameplayInterface,
  SeatSchema,
} from '../../objectModels';
import { cardHandler } from '../../services/gameplay/cardHandler';
import { CancelBattleError } from '../../utils/errors/index';

import {
  deleteValueInHash,
  getAllHash,
  getValueFromKey,
  getValuesFromHash,
  saveValuesInHash,
  setValueInKeyWithExpiry,
} from '../redisWrapper';
import { genericGetOperation, genericSetOperation } from '..';

class PlayerGameplay {
  constructor() {
    this.getPlayerGameplay = this.getPlayerGameplay.bind(this);
    this.setPlayerGameplay = this.setPlayerGameplay.bind(this);
    this.updateCardsByRoundId = this.updateCardsByRoundId.bind(this);
  }

  getPlayerGameplayKey(userId: number, currentRound: number): string {
    return `${TABLE_PREFIX.PLAYER_GAME_PLAY}:${userId}:${currentRound}`;
  }

  async deletePlayerGamePlay(
    userId: number,
    tableId: string,
    currentRound: number,
  ): Promise<void> {
    let deletekeys: string[] = [];
    const getAll: any = await getAllHash(tableId);
    for (const key in getAll) {
      if (
        key.includes(
          `${this.getPlayerGameplayKey(userId, currentRound)}:`,
        )
      )
        deletekeys.push(key);
    }
    await deleteValueInHash(tableId, ...deletekeys);
  }

  async getPlayerGameplay(
    userId: number,
    tableId: string,
    currentRound: number,
    args: string[],
  ) {
    return genericGetOperation(
      tableId,
      this.getPlayerGameplayKey(userId, currentRound),
      args
    );
  }

  async setPlayerGameplay(
    userId: number,
    tableId: string,
    currentRound: number,
    pgpData: any,
  ) {
    return genericSetOperation(
      tableId,
      this.getPlayerGameplayKey(userId, currentRound),
      pgpData
    );
  }

  getDefaultPlayerGameplayData(
    userId: number,
    seatIndex: number,
    dealPoint,
    doesRebuy?: boolean,
    networkParams?: networkParams,
    tableSessionId?: string,
  ): PlayerGameplayInterface {
    return {
      userId,
      currentCards: [],
      groupingCards: [],
      meld: [],
      lastPickCard: '',
      pickCount: 0,
      points: 0,
      rank: 0,
      seatIndex,
      userStatus: PLAYER_STATE.PLAYING,
      dealPoint: dealPoint,
      invalidDeclare: false,
      isFirstTurn: true,
      split: 2,
      isAutoDrop: false,
      isAutoDropSwitch: false,
      turnCount: 0,
      timeoutCount: 0,
      useRebuy: doesRebuy,
      networkParams: networkParams,
      winningCash: 0,
      isPlayAgain: true,
      tableSessionId,
      isBotWinner: false,
      rejectedCards: [],
      pickedCards: [],
    };
  }

  async updateCardsByRoundId(
    seats: SeatSchema[],
    usersCards: string[][],
    tableId: string,
    currentRound: number,
    wildCard: string,
    maximumPoints: number,
    papluCard?: string,
  ): Promise<any> {
    const playersGamePromise = seats.map((seat) =>
      this.getPlayerGameplay(seat._id, tableId, currentRound, [
        'userId',
        'currentCards',
        'groupingCards',
      ]),
    );

    const playersGameData = await Promise.all(playersGamePromise);
    const updatedPGPs = playersGameData.map((playerGameData, i) => {
      if (playerGameData) {
        const grouping = cardHandler.initialCardsGrouping(
          usersCards[i],
        );
        const { meld } = cardHandler.groupCardsOnMeld(
          grouping,
          wildCard,
          maximumPoints,
          papluCard,
        );
        return {
          ...playerGameData,
          currentCards: usersCards[i],
          groupingCards: grouping,
          meld,
        };
      } else {
        return null;
      }
    });
    const cachePromiseList = updatedPGPs.map(
      (newPlayerGameData, i) => {
        if (newPlayerGameData) {
          return this.setPlayerGameplay(
            seats[i]._id,
            tableId,
            currentRound,
            newPlayerGameData,
          );
        }
      },
    );

    await Promise.all(cachePromiseList);
    return updatedPGPs;
  }
}

export const playerGameplayService = new PlayerGameplay();
