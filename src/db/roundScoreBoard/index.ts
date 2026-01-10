import { zk } from '../../connections';
import { TABLE_PREFIX } from '../../constants';
import { RoundScoreBoardDataAckInterface } from '../../objectModels';
import { getIdPrefix } from '../../utils';
import {
  deleteKey,
  getValueFromKey,
  setValueInKeyWithExpiry,
} from '../redisWrapper';

class RoundScoreBoard {
  constructor() {
    this.getRoundScoreBoard = this.getRoundScoreBoard.bind(this);
    this.setRoundScoreBoard = this.setRoundScoreBoard.bind(this);
  }

  getRoundScoreBoardKey(tableId: string, roundNo: number): string {
    return `${getIdPrefix()}:${
      TABLE_PREFIX.ROUND_SCORE_BOARD
    }:${tableId}:${roundNo}`;
  }

  async getRoundScoreBoard(
    tableId: string,
    roundNo = 0,
  ): Promise<RoundScoreBoardDataAckInterface | null> {
    const key = this.getRoundScoreBoardKey(tableId, roundNo);
    const roundScoreBoardData = await getValueFromKey<any>(key);

    return roundScoreBoardData;
  }

  async setRoundScoreBoard(
    tableId: string,
    roundNo: number,
    lastRoundScoreBoardData: any,
  ) {
    const key = this.getRoundScoreBoardKey(tableId, roundNo);

    await setValueInKeyWithExpiry(
      key,
      lastRoundScoreBoardData,
      zk.getConfig()?.REDIS_DEFAULT_EXPIRY * 2,
    );
  }

  async deleteRoundScoreBoard(tableId: string, roundNo: number) {
    const key = this.getRoundScoreBoardKey(tableId, roundNo);
    await deleteKey(key);
  }
}

export const roundScoreBoardService = new RoundScoreBoard();
