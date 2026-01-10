import { TABLE_PREFIX } from '../../constants';
import { getIdPrefix } from '../../utils';
import {
  getValueFromKey,
  setValueInKeyWithExpiry,
} from '../redisWrapper';

class RoundScoreCard {
  constructor() {
    this.getRoundScoreCard = this.getRoundScoreCard.bind(this);
    this.setRoundScoreCard = this.setRoundScoreCard.bind(this);
  }

  getRoundScoreCardKey(tableId: string): string {
    return `${getIdPrefix()}:${
      TABLE_PREFIX.ROUND_SCORE_CARD
    }:${tableId}`;
  }

  async getRoundScoreCard(tableId: string): Promise<any> {
    const key = this.getRoundScoreCardKey(tableId);

    const roundScoreCardData = await getValueFromKey<any>(key);

    return roundScoreCardData;
  }

  async setRoundScoreCard(
    tableId: string,
    lastRoundScoreCardData: any,
  ) {
    const key = this.getRoundScoreCardKey(tableId);
    await setValueInKeyWithExpiry(key, lastRoundScoreCardData);
  }
}

export const roundScoreCardService = new RoundScoreCard();
