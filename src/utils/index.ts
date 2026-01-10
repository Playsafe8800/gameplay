import { Logger } from '../newLogger';
import _ from 'underscore';
import { v4 as uuidv4 } from 'uuid';
import { zk } from '../connections';
import {
  DEFAULT_COINTS,
  EVENTS,
  GAME_IDS,
  NUMERICAL,
  PLAYER_STATE,
  POINTS,
  POOL_TYPES,
  RUMMY_TYPES,
  STRINGS,
} from '../constants';
import { CURRENCY_TYPE } from '../constants/tableState';
import { playerGameplayService } from '../db/playerGameplay';
import { userProfileService } from '../db/userProfile';
import {
  CurrentRoundTurnHistorySchema,
  EliminatedPlayerDataSchema,
  GroupingSchema,
  PlayerGameplay,
  UserCashSchema,
} from '../objectModels';
import { userService } from '../services/userService';
import { socketOperation } from '../socketHandler/socketOperation';
import { GAME_END_REASONS_INSTRUMENTATION } from '../constants/gameEndReasons';
import userServiceExt from '../userService';
import { tableConfigurationService } from 'src/db/tableConfiguration';

export function getMaxRejoinPoints(
  tableConfigData: any,
) {
  const {
    TABLE_MAX_REJOINABLE_POINTS_101,
    TABLE_MAX_REJOINABLE_POINTS_201,
    TABLE_MAX_REJOINABLE_POINTS_61,
  } = zk.getConfig();

  const { maximumPoints } = tableConfigData;

  switch (maximumPoints) {
    case 201:
      return TABLE_MAX_REJOINABLE_POINTS_201;

    case 101:
      return TABLE_MAX_REJOINABLE_POINTS_101;

    case 61:
      return TABLE_MAX_REJOINABLE_POINTS_61;
  }
}

export const rankSortComparator = (a, b) => {
  const comp = b.dealPoint - a.dealPoint;

  if (comp === 0) {
    return a.points - b.points;
  }

  return comp;
};

export function setFinishDataForPlayers(
  players: PlayerGameplay[],
  finishGrpc: any,
): EliminatedPlayerDataSchema[] {
  const updatedPlayersList: EliminatedPlayerDataSchema[] =
    players.map((currentPlayerData) => {
      const finishPlayerData = finishGrpc.playersData.find(
        (finishPlayer) =>
          finishPlayer.userId === currentPlayerData.userId,
      );

      return {
        ...currentPlayerData,
        canPlayAgain: finishPlayerData.canPlayAgain,
        interventionPayload: finishPlayerData.interventionPayload,
        canPlayAgainFailureReason:
          finishPlayerData.canPlayAgainFailureReason,
      };
    });

  return updatedPlayersList;
}

export function deductScoreForDeals(
  playerData: any,
  tableGamePlayData: any,
  points: number,
) {
  playerData.dealPoint -= points;
  playerData.points = points;
  tableGamePlayData.pointsForRoundWinner += points;
  if (playerData.dealPoint < 0) playerData.dealPoint = 0;
}

export function getIdPrefix(GAME_TYPE: string = RUMMY_TYPES.POOL) {
  switch (GAME_TYPE) {
    case RUMMY_TYPES.POOL:
      return STRINGS.RPOM;
    case RUMMY_TYPES.DEALS:
      return STRINGS.RNDM;
    case RUMMY_TYPES.POINTS:
      return STRINGS.RNPM;
    default:
      return undefined;
  }
}
export function getGameId(GAME_TYPE: string) {
  switch (GAME_TYPE) {
    case RUMMY_TYPES.POOL:
      return GAME_IDS.POOL;
    case RUMMY_TYPES.DEALS:
      return GAME_IDS.DEALS;
    case RUMMY_TYPES.POINTS:
      return GAME_IDS.POINTS;
    default:
      return undefined;
  }
}

export function roundInt(nmbr: number, decimalCount: number) {
  let cardPoints = nmbr;
  cardPoints = Math.round(cardPoints * 10 ** decimalCount);
  cardPoints /= 10 ** decimalCount;
  return cardPoints;
}

export function flattenObject(obj: Record<string, any>) {
  const finalObj = {};
  Object.keys(obj).forEach((val) => {
    const value = obj[val];
    const type = typeof value;
    if (value === undefined){
      finalObj[val] = "undefined"
    } else if (type === 'object') {
      finalObj[val] = JSON.stringify(value);
    } else {
      finalObj[val] = value;
    }
  });
  return finalObj;
}

export function getRandomTableId() {
  const tableId: string = uuidv4();
  return tableId.replace(/-/g, '');
}

/**
 * remove pick card from grouping cards and send updated grouping cards
 * @param {string} removeCard
 * @param {GroupingSchema} groupCards
 * @returns {GroupingSchema}
 * @deprecated
 */
export function removePickCardFromGroupingCards(
  removeCard: string,
  groupCards: GroupingSchema,
): GroupingSchema {
  const gCards = groupCards;
  if (!removeCard || _.isEmpty(groupCards)) {
    return gCards;
  }
  if (gCards.pure.length > 0) {
    const pureCards = gCards.pure;
    for (let i = 0; i < pureCards.length; i++) {
      if (_.contains(pureCards[i], removeCard)) {
        pureCards[i] = _.without(pureCards[i], removeCard);
        break;
      }
    }

    gCards.pure = pureCards;
  }

  if (gCards.seq.length > 0) {
    const seqCards = gCards.seq;
    for (let j = 0; j < seqCards.length; j++) {
      if (_.contains(seqCards[j], removeCard)) {
        seqCards[j] = _.without(seqCards[j], removeCard);
        break;
      }
    }

    gCards.seq = seqCards;
  }

  if (gCards.set.length > 0) {
    const setCards = gCards.set;
    for (let k = 0; k < setCards.length; k++) {
      if (_.contains(setCards[k], removeCard)) {
        setCards[k] = _.without(setCards[k], removeCard);
        break;
      }
    }

    gCards.set = setCards;
  }

  if (gCards.dwd.length > 0) {
    const dwdCards = gCards.dwd;
    for (let l = 0; l < dwdCards.length; l++) {
      if (_.contains(dwdCards[l], removeCard)) {
        dwdCards[l] = _.without(dwdCards[l], removeCard);
        break;
      }
    }
    gCards.dwd = dwdCards;
  }
  return gCards;
}

export function removePickCardFromCards(
  removeCard: string,
  groupCards: Array<Array<string>>,
): Array<Array<string>> {
  const gCards = groupCards;
  if (!removeCard || _.isEmpty(groupCards)) {
    return gCards;
  }

  for (let j = 0; j < groupCards.length; j++) {
    const group = groupCards[j];
    if (_.contains(group, removeCard)) {
      groupCards[j] = _.without(group, removeCard);
      break;
    }
  }
  return gCards;
}

export function issGroupingCardAndCurrentCardSame(
  currentCards: Array<string>,
  groupCards: Array<Array<string>>,
) {
  const flagGroupCards = groupCards.flat(1);
  const sortedGroupCards = flagGroupCards.sort();
  const sortedCurrentCards = [...currentCards].sort();

  /**
   * Taking maximum of grouping and current cards.
   * this will thow error also if the length of two are not same
   */
  const loopTill = Math.max(
    currentCards.length,
    flagGroupCards.length,
  );

  for (let i = 0; i < loopTill; ++i) {
    if (sortedCurrentCards[i] !== sortedGroupCards[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Gets the drop points as per first or middle drop
 * @param {Boolean} isFirstTurn
 * @param {number} maxPoints
 * @returns {Number}
 */
export function getDropPoints(
  isFirstTurn: boolean,
  maxPoints: number,
  gameType: string,
  playerCount: number,
): number {
  let points = 0;
  if (gameType === RUMMY_TYPES.DEALS) {
    if (playerCount > NUMERICAL.TWO) {
      if (isFirstTurn) points = POINTS.FIRST_DROP;
      else points = POINTS.MIDDLE_DROP;
    } else points = POINTS.TIMEOUT_DROP;
  } else {
    if (maxPoints === POOL_TYPES.TWO_ZERO_ONE) {
      // If first turn
      if (isFirstTurn) points = POINTS.FIRST_DROP_201;
      // else If first turn
      else points = POINTS.MIDDLE_DROP_201;
    } else if (maxPoints === POOL_TYPES.SIXTY_ONE) {
      if (isFirstTurn) points = POINTS.FIRST_DROP_61;
      else points = POINTS.MIDDLE_DROP_61;
    }
    // If first turn
    else if (isFirstTurn) points = POINTS.FIRST_DROP;
    // else If first turn
    else points = POINTS.MIDDLE_DROP;
  }
  return points;
}

export function getDropStatus(
  points: number,
  isAutoDrop: boolean,
): string {
  if (points < POINTS.MIDDLE_DROP_61) {
    return isAutoDrop
      ? GAME_END_REASONS_INSTRUMENTATION.AUTO_DROP_DROP
      : GAME_END_REASONS_INSTRUMENTATION.DROP;
  } else {
    return isAutoDrop
      ? GAME_END_REASONS_INSTRUMENTATION.AUDO_MIDDLE_DROP
      : GAME_END_REASONS_INSTRUMENTATION.MIDDLE_DROP;
  }
}
export function isGameTie(
  playersGameData: (PlayerGameplay | null)[],
) {
  const { length } = playersGameData;
  const dealPoint =
    playersGameData[0] && playersGameData[0].dealPoint;

  for (let i = 1; i < length; ++i) {
    if (!playersGameData[i]) continue;
    //@ts-ignore
    if (playersGameData[i].dealPoint != dealPoint) return false;
  }
  return true;
}

export function getFormat(
  gameFormat: string = RUMMY_TYPES.MULTI_TABLE_POOL_RUMMY,
) {
  switch (gameFormat) {
    case RUMMY_TYPES.MULTI_TABLE_POOL_RUMMY:
      return RUMMY_TYPES.POOL;
    case RUMMY_TYPES.MULTI_TABLE_DEALS_RUMMY:
      return RUMMY_TYPES.DEALS;
    case RUMMY_TYPES.MULTI_TABLE_POINTS_RUMMY:
      return RUMMY_TYPES.POINTS;
    default:
      return RUMMY_TYPES.POOL;
  }
}

export function getFormatV2(gameFormat: string) {
  const format = Number(gameFormat);
  switch (format) {
    case 1:
      return RUMMY_TYPES.POOL;
    case 2:
      return RUMMY_TYPES.POINTS;
    case 3:
      return RUMMY_TYPES.DEALS;
    default:
      return RUMMY_TYPES.POOL;
  }
}

export function getBootValue(value: number, currencyType: string) {
  // if (currencyType === CURRENCY_TYPE.COINS)
  //   return DEFAULT_COINTS.COINS;
  return value;
}

export function getWinnings(
  bootValue: number,
  rank: number,
  noOfPlayers: number,
  currencyType: string,
  winnings: number,
) {
  if (currencyType === CURRENCY_TYPE.COINS) {
    if (rank === NUMERICAL.ONE) return bootValue * noOfPlayers;
    return -Math.abs(bootValue);
  } else {
    return winnings;
  }
}

export function removeEmptyString(str: string): string {
  const arr = str.split(',');
  const newArr: Array<string> = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== '') {
      newArr.push(arr[i]);
    }
  }
  const newStr = newArr.join(',');
  return newStr;
}

export function isPointsRummyFormat(gameType: string) {
  return !!(gameType === RUMMY_TYPES.POINTS);
}

export function formatGameDetails(
  currentRound: number,
  tableGamePlayData: any,
  currentRoundHistory: any,
  winnerId = 0,
) {
  const gameDetails: Array<CurrentRoundTurnHistorySchema> = [
    {
      roundNo: currentRound,
      roundId: tableGamePlayData._id,
      winnerId,
      createdOn: tableGamePlayData.createdAt,
      modifiedOn: tableGamePlayData.updatedAt,
      extra_info: tableGamePlayData.trumpCard,
      turnsDetails: currentRoundHistory?.turnsDetails,
      userFinalStateTurnDetails:
        currentRoundHistory?.userFinalStateTurnDetails,
    },
  ];
  return gameDetails;
}

// send auto debit info after updating wallet
export function sendAutoDebitInfo(payload: {
  socketId: string;
  tableId: string;
  userId: number;
  amount: number;
}) {
  const { socketId, tableId, userId } = payload;
  let { amount = 0 } = payload;
  amount = roundInt(amount, 2);
  Logger.info(
    `sendAutoDebitInfo tableId: ${tableId}, 
      userId: ${userId}, 
      socketId: ${socketId}
      amount: ${amount}`,
  );
  let msg = zk.getConfig().ADM;
  msg = msg.replace('#80', `${amount}`);
  const responseData = {
    userId,
    tableId,
    message: msg, // config().ADM,
  };
  socketOperation.sendEventToClient(
    socketId,
    responseData,
    EVENTS.AUTO_DEBIT_INFO_SOCKET_EVENT,
  );
}

export async function updateUserCash(
  playerGamePlayData: any,
  tableId: string,
  currentRound: number,
  userCashAmount: number,
  gamePlaytext: string,
  playerData: any,
  option?: { isAddCashUpdate?: boolean; autodebitAmount?: number },
) {
  try {
    if (!playerGamePlayData && !option?.isAddCashUpdate) return false;

    userCashAmount = Number(userCashAmount);

    const userCashObj = (playerData?.userTablesCash &&
      playerData?.userTablesCash.find(
        (utc: UserCashSchema) => utc.tableId === tableId,
      )) || { userCash: 0 };

    let netUserCashAmount =
      // userCashAmount + 500 < 0 ? 0 : userCashAmount + 500;
      userCashAmount + userCashObj.userCash < 0
        ? 0
        : userCashAmount + userCashObj.userCash;
    netUserCashAmount = roundInt(netUserCashAmount, 2);

    playerData.userTablesCash = playerData.userTablesCash.map(
      (utc: UserCashSchema) => {
        if (utc.tableId === tableId) {
          utc.userCash = netUserCashAmount;
        }
        return utc;
      },
    );

    // created a block to keep data seperate from outer declarations
    const data = {
      tableId,
      userId: playerGamePlayData
        ? playerGamePlayData.userId
        : playerData.id,
      userCash: netUserCashAmount,
      reason: gamePlaytext,
    };
    socketOperation.sendEventToRoom(
      tableId,
      EVENTS.UPDATE_USER_CASH_SOCKET_EVENT,
      data,
    );

    if (playerGamePlayData) {
      await playerGameplayService.setPlayerGameplay(
        playerGamePlayData.userId,
        tableId,
        currentRound,
        playerGamePlayData,
      );
    }

    await userProfileService.setUserDetails(
      playerData.id,
      playerData,
    );
    return netUserCashAmount;
  } catch (error) {
    Logger.error(`INTERNAL_SERVER_ERROR Validation Error at updateUserCash: `, [error]);
  }
}

export async function setUserCash(
  tableId: string,
  userCashAmount: number,
  gamePlaytext: string,
  playerData: any,
  isNewUI: boolean,
) {
  try {
    userCashAmount = Number(userCashAmount);

    playerData.userTablesCash = playerData.userTablesCash.map(
      (utc: UserCashSchema) => {
        if (utc.tableId === tableId) {
          utc.userCash = userCashAmount;
        }
        return utc;
      },
    );

    // created a block to keep data seperate from outer declarations
    const data = {
      tableId,
      userId: playerData.id,
      userCash: userCashAmount,
      reason: gamePlaytext,
    };
    socketOperation.sendEventToRoom(
      tableId,
      EVENTS.UPDATE_USER_CASH_SOCKET_EVENT,
      data,
    );

    await userProfileService.setUserDetails(
      playerData.id,
      playerData,
    );
    if (isNewUI) {
      await userService.getUserBalance(
        playerData.id,
        playerData.socketId,
        playerData.token,
      );
    }
    return userCashAmount;
  } catch (error) {
    Logger.error(`INTERNAL_SERVER_ERROR Validation Error at setUserCash: `, [error]);
    return 0;
  }
}

export function getRoundEndReason(
  playerGameplay: PlayerGameplay,
  winnerId: number,
): string {
  const { userId } = playerGameplay;
  let gameEndReason =
    winnerId === userId
      ? GAME_END_REASONS_INSTRUMENTATION.WINNER
      : playerGameplay.gameEndReason;
  if (!gameEndReason)
    gameEndReason =
      playerGameplay.userStatus === PLAYER_STATE.FINISH
        ? GAME_END_REASONS_INSTRUMENTATION.LOST
        : GAME_END_REASONS_INSTRUMENTATION.ELIMINATED;
  return gameEndReason;
}

export async function getBot(lobbyAmount) {
  const botData = await userServiceExt.getAvailableBot(lobbyAmount);
  if (botData) {
    return botData;
  } else {
    await userServiceExt.generateBot();
    return getBot(lobbyAmount);
  }
}
