import { Logger } from '../../newLogger';
import { NUMERICAL, TABLE_PREFIX } from '../../constants';
import { ERROR_CAUSES } from '../../constants/errors';
import { SplitInfo } from '../../objectModels';
import { OpenDiscardedCards } from '../../objectModels/openDiscardedCards';
import { getIdPrefix } from '../../utils';
import { CancelBattleError } from '../../utils/errors/index';
import {
  openDiscardedCardsValidator
} from '../../validators/model.validator';
import {
  deleteKey,
  deleteValueInHash,
  getAllHash,
  getValueFromKey,
  getValuesFromHash,
  saveValuesInHash,
  setValueInKeyWithExpiry,
} from '../redisWrapper/index';
import { genericGetOperation, genericSetOperation } from '..';

class TableGameplay {
  private getTableGameplayKey(currentRound: number) {
    return `${TABLE_PREFIX.TABLE_GAME_PLAY}:${currentRound}`;
  }

  private getOpenDiscardedCardKey(
    tableId: string,
    currentRound: number,
  ) {
    return `${getIdPrefix()}:${
      TABLE_PREFIX.OPEN_DISCARDED_CARDS
    }:${tableId}:${currentRound}`;
  }

  async getTableGameplay(
    tableId: string,
    currentRound: number,
    args: string[]
  ) {
    return genericGetOperation(tableId, this.getTableGameplayKey(currentRound), args);
  }

  async setTableGameplay(
    tableId: string,
    currentRound: number,
    tableGameplayData: any,
  ) {
    return genericSetOperation(tableId, this.getTableGameplayKey(currentRound), tableGameplayData);
  }

  async deleteTableGameplay(tableId: string, currentRound: number) {
    let deletekeys: string[] = [];
    const getAll: any = await getAllHash(tableId);
    for (const key in getAll) {
      if (key.includes(`${this.getTableGameplayKey(currentRound)}:`))
        deletekeys.push(key);
    }
    await deleteValueInHash(tableId, ...deletekeys);
  }

  private getSplitRequestKey(tableId: string) {
    return `${getIdPrefix()}:${
      TABLE_PREFIX.SPLIT_REQUEST
    }:${tableId}`;
  }

  async getSplitRequest(tableId: string) {
    const key = this.getSplitRequestKey(tableId);
    return getValueFromKey(key);
  }

  async updateSplitRequest(
    tableId: string,
    updatedSplitData: SplitInfo,
  ) {
    const key = this.getSplitRequestKey(tableId);
    const splitData: any = await this.getSplitRequest(key);

    if (!splitData) {
      return setValueInKeyWithExpiry(
        key,
        updatedSplitData,
        NUMERICAL.FIFTEEN,
      );
    }

    return setValueInKeyWithExpiry(key, {
      ...splitData,
      ...updatedSplitData,
    });
  }

  async deleteSplitRequest(tableId: string) {
    const key = this.getSplitRequestKey(tableId);
    await deleteKey(key);
  }

  async getOpenDiscardedCards(
    tableId: string,
    currentRound: number,
  ): Promise<OpenDiscardedCards | null> {
    try {
      const key = this.getOpenDiscardedCardKey(tableId, currentRound);
      const OpenDiscardedCardsData =
        await getValueFromKey<OpenDiscardedCards>(key);
      return OpenDiscardedCardsData;
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error occurred in getOpenDiscardedCards ${error.message} ${error}`,
      );
      return null;
    }
  }

  async setOpenDiscardedCards(
    tableId: string,
    currentRound: number,
    OpenDiscardedCardsData: OpenDiscardedCards,
  ) {
    try {
      openDiscardedCardsValidator(OpenDiscardedCardsData);
      const key = this.getOpenDiscardedCardKey(tableId, currentRound);
      await setValueInKeyWithExpiry(key, OpenDiscardedCardsData);
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error occurred in setOpenDiscardedCards ${error.message} ${error}`,
      );
      throw new CancelBattleError(
        error.message,
        ERROR_CAUSES.VALIDATION_ERROR,
      );
    }
  }
}

export const tableGameplayService = new TableGameplay();
