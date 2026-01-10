import { getIdPrefix } from '../../utils';
import { TABLE_PREFIX } from '../../constants';
import {
  setValueInKeyWithExpiry,
  getValueFromKey,
  deleteKey,
} from '../redisWrapper/index';
class State {
  private getStateManagementKeyTable(tableId: string) {
    return `${getIdPrefix()}:${TABLE_PREFIX.STATE}:${tableId}`;
  }

  private getStateManagementKeyUser(tableId: string, userId: number) {
    return `${getIdPrefix()}:${
      TABLE_PREFIX.STATE
    }:${tableId}:${userId}`;
  }

  async getStateTable(tableId: string) {
    const stateKey = this.getStateManagementKeyTable(tableId);
    const stateData = await getValueFromKey<any>(stateKey);
    return stateData;
  }

  async getStateUser(tableId: string, userId: number) {
    const stateKey = this.getStateManagementKeyUser(tableId, userId);
    const stateData = await getValueFromKey<any>(stateKey);
    return stateData;
  }
  async setStateTable(tableId: string, stateData: any) {
    const key = this.getStateManagementKeyTable(tableId);
    await setValueInKeyWithExpiry(key, stateData);
  }

  async setStateUser(
    tableId: string,
    userId: number,
    stateData: any,
  ) {
    const key = this.getStateManagementKeyUser(tableId, userId);
    await setValueInKeyWithExpiry(key, stateData);
  }
}

export const stateManagementService = new State();
