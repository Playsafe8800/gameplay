import { getIdPrefix } from './index';
import { RUMMY_TYPES } from '../constants/index';
/**
 *
 * @returns
 */
export function getRandomUUID(gameType: string = RUMMY_TYPES.POOL) {
  const str = `${getIdPrefix(
    gameType,
  )}-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx-${new Date().getTime()}`;
  return str.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
