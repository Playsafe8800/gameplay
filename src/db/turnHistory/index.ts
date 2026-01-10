import { GameHistoryData } from '../../services/aws';
import { TABLE_PREFIX } from '../../constants';
import { NUMERICAL } from '../../constants/numerical';
import {
  CurrentRoundTurnHistorySchema,
} from '../../objectModels';
import { getIdPrefix } from '../../utils';
import {
  getValueFromKey,
  setValueInKeyWithExpiry,
} from '../redisWrapper/index';

class TurnHistory {
  getTurnHistoryKey(tableId: string, roundNumber: number): string {
    return `${getIdPrefix()}:${
      TABLE_PREFIX.TURN_HISTORY
    }:${tableId}:${roundNumber}`;
  }

  async getTurnHistory(
    tableId: string,
    roundNumber: number = NUMERICAL.ONE,
  ) {
    const turnHistoryKey = this.getTurnHistoryKey(
      tableId,
      roundNumber,
    );
    const turnHistoryData =
      await getValueFromKey<CurrentRoundTurnHistorySchema>(
        turnHistoryKey,
      );
    return turnHistoryData;
  }

  async setTurnHistory(
    tableId: string,
    roundNumber: number = NUMERICAL.ONE,
    turnHistoryData: CurrentRoundTurnHistorySchema,
  ) {
    const turnHistoryKey = this.getTurnHistoryKey(
      tableId,
      roundNumber,
    );
    await setValueInKeyWithExpiry(turnHistoryKey, turnHistoryData);
  }

  async setGameTurnHistory(
    tableId: string,
    turnHistoryData: GameHistoryData,
  ) {
    await setValueInKeyWithExpiry(`HISTORY:${tableId}`, turnHistoryData, 1800);
  }

  getDefaultTurnHistoryData(
    tableData: any,
    tableGameData: any,
  ) {
    return {
      history: [
        this.getDefaultCurrentRoundTurnHistoryData(
          tableData,
          tableGameData,
        ),
      ],
    };
  }

  getDefaultCurrentRoundTurnHistoryData(
    tableData: any,
    tableGameData: any,
  ): CurrentRoundTurnHistorySchema {
    const currentTime = new Date().toISOString();
    return {
      roundNo: tableData.currentRound,
      roundId: tableGameData._id,
      winnerId: -1,
      createdOn: currentTime,
      modifiedOn: currentTime,
      extra_info: tableGameData.trumpCard,
      turnsDetails: [],
    };
  }
}

export const turnHistoryService = new TurnHistory();
