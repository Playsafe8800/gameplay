import { Logger } from '../../newLogger';
import { CONFIG, TABLE_PREFIX } from '../../constants';
import { CURRENCY_TYPE } from '../../constants/tableState';
import {
  LobbyGameConfig,
  TableConfiguration as TableConfigurationInterface,
} from '../../objectModels';
import { getFormatV2, getRandomTableId } from '../../utils';
import { getBootValue } from '../../utils/index';
import {
  deleteHash,
  deleteValueInHash,
  getAllHash,
  getValueFromKey,
  getValuesFromHash,
  saveValuesInHash,
  setHashExpiry,
} from '../redisWrapper/index';
import { genericGetOperation, genericSetOperation } from '..';

class TableConfiguration {
  private getTableConfigurationKey(): string {
    return `T`;
  }
  private getLobbyDetailsKey(lobbyId: number) {
    return `${TABLE_PREFIX.LOBBY}:${lobbyId}`;
  }

  async deleteTable(tableId: string) {
    const isDeleted = await deleteHash(tableId);
    Logger.info(
      `Table configuration deletion request received ${tableId} isDeleted ${isDeleted}`,
    );
    return isDeleted;
  }

  async getTableConfiguration(tableId: string, args: string[]) {
    return genericGetOperation(tableId, this.getTableConfigurationKey(), args);
  }

  async setTableConfiguration(
    tableId: string,
    tableConfigurationData: any,
    initial = false,
  ) {
    await genericSetOperation(tableId, this.getTableConfigurationKey(), tableConfigurationData);
    if (initial) await setHashExpiry(tableId);
  }

  async getLobbyDetailsForMM(lobbyId: number) {
    if (!lobbyId) {
      throw new Error(
        `Lobby details not set getLobbyDetailsForMM for tab e ${lobbyId}`,
      );
    }
    const key = this.getLobbyDetailsKey(lobbyId);
    const lobbyDetails =
      await getValueFromKey<TableConfigurationInterface>(key);

    return lobbyDetails;
  }

  async updateCurrentRound(tableId: string, currentRound: number) {
    const hashKeysObj = {};
    hashKeysObj[`${this.getTableConfigurationKey()}:currentRound`] =
      currentRound;
    await saveValuesInHash(tableId, hashKeysObj);
  }

  async deleteTableConfiguration(tableId: string) {
    Logger.info(
      `Table configuration deletion request received ${tableId}`,
    );
    let deletekeys: string[] = [];
    const getAll: any = await getAllHash(tableId);
    for (const key in getAll) {
      if (key.includes(`${this.getTableConfigurationKey()}:`))
        deletekeys.push(key);
    }
    await deleteValueInHash(tableId, ...deletekeys);
  }

  /**
   *
   * @param LobbyTableConfig {LobbyGameConfig}
   * @param tableId pass when tableId is available (optional)
   *
   */
  getDefaultTableConfigRedisObject(
    LobbyTableConfig: LobbyGameConfig,
    tableId?: string,
  ): TableConfigurationInterface {
    const {
      EntryFee,
      GameId,
      GameStartTimer,
      UserFinishTimer,
      LobbyId,
      ManualSplit,
      MaxPoints,
      MaxPlayers,
      MinPlayers,
      RoundShuffle,
      UserTurnTimer,
      Rake,
      Round_count = 2,
      PileDiscardCheck,
      isNewUI,
      globalMatchMaking,
      mmAlgo,
      GameFormat,
      cgsClusterName,
      CurrencyFactor = EntryFee,
      CurrencyId,
      isMultiBotEnabled
    } = LobbyTableConfig;
    return {
      _id: tableId || getRandomTableId(),
      bootValue: getBootValue(EntryFee, getCurrencyType(EntryFee)),
      currencyFactor: CurrencyFactor,
      gameId: GameId,
      gameStartTimer: GameStartTimer,
      userFinishTimer: UserFinishTimer,
      lobbyId: LobbyId,
      manualSplit: ManualSplit,
      maximumPoints: MaxPoints,
      maximumSeat: MaxPlayers,
      minimumSeat: MinPlayers,
      multiWinner: false,
      pileDiscardEnabled: PileDiscardCheck,
      rakePercentage: Rake,
      currentRound: 1,
      shuffleEnabled: RoundShuffle,
      userTurnTimer: UserTurnTimer,
      isSplitable: ManualSplit,
      isNewGameTableUI: isNewUI,
      dealsCount: Round_count,
      globalMatchMaking,
      mmAlgo,
      gameType: getFormatV2(GameFormat),
      currencyType: CurrencyId,
      cgsClusterName: cgsClusterName
        ? cgsClusterName
        : CONFIG.CGS_NAME,
      isMultiBotEnabled
    };
  }
}

function getCurrencyType(entryFee: number): string {
  if (entryFee === 0) return CURRENCY_TYPE.COINS;
  return CURRENCY_TYPE.INR;
}

export const tableConfigurationService = new TableConfiguration();
