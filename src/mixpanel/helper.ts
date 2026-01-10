import { CURRENCY_TYPE } from '../constants';
import addMixpanelEvent from './index';

export const sendDropMixpanel = (
  currencyType,
  gameId,
  maximumPoints,
  bootValue,
  userId: number,
  tableId: string,
  currentRound,
  maximumSeat,
  isBot: boolean,
  isDrop: boolean,
  timeout: boolean
) => {
  let isFree = currencyType === CURRENCY_TYPE.COINS;
  let gameTitle = '';
  if (gameId === 1) {
    gameTitle = `${maximumPoints} POOL`;
  } else if (gameId === 2) {
    gameTitle = isFree ? `POINTS` : `${bootValue} /POINT`;
  } else {
    gameTitle = isFree ? `DEALS` : `2 DEALS`;
  }
  let dataObj ={
    userId,
    event: 'drop',
    tableId,
    round: currentRound,
    gameFormat: gameTitle,
    maxPlayers: maximumSeat,
    entryAmount: bootValue,
    isBot: isBot,
    Drop: isDrop,
    timeout,
  }
  addMixpanelEvent('BE_bot_drop', dataObj);
}