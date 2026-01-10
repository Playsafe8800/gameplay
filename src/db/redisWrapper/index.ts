import commands from './commands';
import { REDIS_CONSTANTS } from '../../constants';
import { CONFIG } from '../../constants';
import { zk } from '../../connections';
import { flattenObject } from '../../utils/index';
const { REDIS_DEFAULT_EXPIRY } = zk.getConfig();

/* Keys queries */

export const setValueInKey = async (key: string, obj: any) =>
  commands.keyCommands.set(key, JSON.stringify(obj));

export const setValueInKeyWithExpiry = async (
  key: string,
  obj: any,
  exp = REDIS_DEFAULT_EXPIRY || CONFIG.REDIS_DEFAULT_EXPIRY,
) => {
  return commands.keyCommands.setex(key, exp, JSON.stringify(obj));
};

export const getValueFromKey = async <T>(key: string): Promise<T> => {
  const valueStr = await commands.keyCommands.get(key);
  return valueStr ? JSON.parse(valueStr) : null;
};

export const deleteKey = async (key: string): Promise<boolean> =>
  commands.keyCommands.del(key);

export const pushIntoQueue = async (
  key: string,
  element: any,
): Promise<number> =>
  commands.queueCommands.push(
    `${REDIS_CONSTANTS.QUEUE}:${key}`,
    JSON.stringify(element),
  );

export const popFromQueue = async <T>(key: string): Promise<T> => {
  const resStr = await commands.queueCommands.pop(
    `${REDIS_CONSTANTS.QUEUE}:${key}`,
  );
  return JSON.parse(resStr);
};

export const pexpire = async (
  key: string,
  value: any,
): Promise<number> => commands.keyCommands.pexpire(key, value);

export const addValueInSortedSet = async (
  key: string,
  score: number,
  value: string,
): Promise<number> =>
  commands.sortedSetCommands.add(key, score, value);

export const removeValueFromSortedSet = async (
  key: string,
  value: string,
): Promise<number> => commands.sortedSetCommands.rem(key, value);

export const removeValueFromSet = async (
  key: string,
  value: string,
): Promise<number> =>
  commands.setCommands.rem(key, JSON.stringify(value));

export const getTopValueFromSortedSet = async (
  key: string,
): Promise<string[]> => commands.sortedSetCommands.peek(key, 0, 0);

export const getAndRemoveOldestSet = async (
  key: string,
): Promise<any[]> => commands.sortedSetCommands.zpopmin(key);

export const getValuesFromHash = async <T>(
  key: string,
  args: string[]
): Promise<T | null> => {
  const result = await commands.hashCommand.hmget(key, ...args);

  if (result) {
    return result.map((value) => {
      if (value === "undefined") return undefined;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }) as T;
  }

  return null;
};

export const saveValuesInHash = async (
  key: string,
  values: object,
) => {
  values = flattenObject(values);
  const hashValue = Object.entries(values).flat();

  await commands.hashCommand.hmset(key, ...hashValue);
};

export const deleteValueInHash = async <T>(
  key: string,
  ...args: string[]
): Promise<T | null> => {
  return await commands.hashCommand.hdel(key, ...args);
};

export const deleteHash = async <T>(
  key: string
): Promise<T | null> => {
  return await commands.hashCommand.hdel(key);
};

export const setHashExpiry = async <T>(
  key: string
): Promise<T | null> => {
  return await commands.hashCommand.expire(key, CONFIG.REDIS_DEFAULT_EXPIRY);
};

export const getAllHash = async <T>(
  key: string,
): Promise<T | null> => {
  return await commands.hashCommand.hgetall(key);
};
