import { Logger } from '../newLogger';
import { ERROR_CAUSES } from '../constants/errors';
import { CancelBattleError } from '../utils/errors/index';
import { getValuesFromHash, saveValuesInHash } from './redisWrapper/index';

export async function genericGetOperation<T>(
  tableId: string,
  keyPrefix: string,
  args: string[]
): Promise<any> {
  try {
    const prefixedArgs = args.map((arg) => `${keyPrefix}:${arg}`);
    const result: any = await getValuesFromHash(tableId, prefixedArgs);

    const genericRes: { [key: string]: any } = {};
    args.forEach((arg, index) => {
      genericRes[arg] = result[index];
    });
    return genericRes
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR Error occurred in ${error.message} ${error}`);
    throw new CancelBattleError(error.message, ERROR_CAUSES.VALIDATION_ERROR);
  }
}

export async function genericSetOperation(
  tableId: string,
  keyPrefix: string,
  data: any
): Promise<void> {
  try {
    const hashKeysObj = {};
    for (const key in data) {
      hashKeysObj[`${keyPrefix}:${key}`] = data[key];
    }
    await saveValuesInHash(tableId, hashKeysObj);
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR Error occurred in ${error.message} ${error}`);
    throw new CancelBattleError(error.message, ERROR_CAUSES.VALIDATION_ERROR);
  }
}