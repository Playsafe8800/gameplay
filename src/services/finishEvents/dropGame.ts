import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import {
  GAME_END_REASONS,
  NUMERICAL,
  PLAYER_STATE,
  POINTS,
  RUMMY_TYPES,
  TABLE_STATE,
  TURN_HISTORY,
  EVENTS,
  USER_EVENTS,
  GAME_END_REASONS_INSTRUMENTATION,
  POOL_TYPES, CURRENCY_TYPE,
} from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { turnHistoryService } from '../../db/turnHistory';
import { userProfileService } from '../../db/userProfile';
import {
  PlayerGameplay,
  TableConfigDropGame,
  UserCashSchema,
  UserProfile,
  networkParams,
  UpdateTurnDetailsSchema,
  CurrentRoundTurnHistorySchema,
} from '../../objectModels';

import { socketOperation } from '../../socketHandler/socketOperation';
import { eventStateManager } from '../../state/events';
import {
  deductScoreForDeals,
  formatGameDetails,
  getDropPoints,
  getDropStatus,
  isPointsRummyFormat,
  roundInt,
} from '../../utils';
import { dateUtils } from '../../utils/date';
import { CancelBattleError } from '../../utils/errors/index';
import { getPlayingUserInRound } from '../../utils/getPlayingUserInRound';
import { redlock } from '../../utils/lock/redlock';
import {
  validateAutoDropCardReq,
  validateDropCardReq,
  validateDropCardRoomPointsRes,
  validateDropCardRoomRes,
} from '../../validators';
import { cancelBattle } from '../gameplay/cancelBattle';
import { changeTurn } from '../gameplay/turn';
import { switchTable } from '../leaveTable/switchTable';
import { scheduler } from '../schedulerQueue';
import { winner } from './winner';
import { winnerPoints } from './winnerPoints';
import { UpdateTurnDetails } from '../../utils/turnHistory';
import addMixpanelEvent from '../../mixpanel';
import { sendDropMixpanel } from '../../mixpanel/helper';

async function handleInvalidDeclareDrop(
  tableConfigData: TableConfigDropGame,
  playersGamePlayData: any[],
  playerGamePlayData: any,
  tableGamePlayData: any,
  playerData: UserProfile,
  currentRoundHistory: CurrentRoundTurnHistorySchema,
) {
  Logger.info(`handleInvalidDeclareDrop: ${tableConfigData._id}`, [
    tableConfigData,
    playersGamePlayData,
    playerGamePlayData,
    tableGamePlayData,
    playerData,
  ]);

  const { currentRound, _id: tableId } = tableConfigData;
  const { userId } = playerGamePlayData;

  let points = 0;
  if (tableConfigData.gameType === RUMMY_TYPES.DEALS) {
    points = POINTS.MAX_DEADWOOD_POINTS;
  } else {
    points =
      tableConfigData.maximumPoints === POOL_TYPES.SIXTY_ONE
        ? POINTS.MAX_DEADWOOD_POINTS_61
        : POINTS.MAX_DEADWOOD_POINTS;
  }

  playerGamePlayData.userStatus = PLAYER_STATE.LOST;
  playerGamePlayData.gameEndReason =
    playerGamePlayData.gameEndReason ||
    GAME_END_REASONS_INSTRUMENTATION.LOST;
  playerGamePlayData.points = points;

  const playingPlayers = getPlayingUserInRound(
    playersGamePlayData,
    true,
  ).filter((ele) => ele.userId !== userId);

  if (tableConfigData.gameType === RUMMY_TYPES.POOL) {
    playerGamePlayData.dealPoint += points;
  } else if (tableConfigData.gameType === RUMMY_TYPES.DEALS) {
    deductScoreForDeals(
      playerGamePlayData,
      tableGamePlayData,
      points,
    );
  } else {
    playerGamePlayData.dealPoint -= points;
  }

  tableGamePlayData.totalPlayerPoints += points;
  currentRoundHistory.turnsDetails[
    currentRoundHistory.turnsDetails.length - 1
  ].points = points;

  currentRoundHistory.turnsDetails[
    currentRoundHistory.turnsDetails.length - 1
  ].turnStatus = TURN_HISTORY.INVALID_DECLARE;
  playerGamePlayData.invalidDeclare = true;
  tableGamePlayData.tableState = TABLE_STATE.ROUND_STARTED;

  const currentTurnData: UpdateTurnDetailsSchema = {
    points,
    turnStatus: TURN_HISTORY.INVALID_DECLARE,
  };

  await Promise.all([
    tableConfigurationService.setTableConfiguration(
      tableConfigData._id,
      tableConfigData,
    ),
    tableGameplayService.setTableGameplay(
      tableConfigData._id,
      currentRound,
      tableGamePlayData,
    ),
    playerGameplayService.setPlayerGameplay(
      userId,
      tableId,
      currentRound,
      playerGamePlayData,
    ),
    UpdateTurnDetails(tableId, currentRound, currentTurnData),
    turnHistoryService.setTurnHistory(
      tableId,
      currentRound,
      currentRoundHistory,
    ),
  ]);

  const tableResponse = {
    tableId,
    userId,
    totalPoints: playerGamePlayData.dealPoint,
    status: PLAYER_STATE.LOST.toLowerCase(),
  };
  validateDropCardRoomRes(tableResponse);

  await Promise.all([
    socketOperation.sendEventToRoom(
      tableId,
      EVENTS.DROP_SOCKET_EVENT,
      tableResponse,
    ),
    eventStateManager.fireEventUser(
      tableId,
      userId,
      USER_EVENTS.FINISH,
      dateUtils.getCurrentEpochTime(),
    ),
  ]);

  Logger.info('handleInvalidDeclareDrop: playing players', [
    playingPlayers,
  ]);

  /**
   * If table has only two activePlayers (incl player who did invalid declare)
   * perform rummy format specific action
   */
  if (playingPlayers.length < 2) {
    // declare the winner
    await winner.handleWinner(
      playerGamePlayData,
      tableConfigData,
      tableGamePlayData,
    );
  } else {
    await changeTurn(tableId);
  }
}

async function handleDrop(
  tableConfigData: TableConfigDropGame,
  playersGamePlayData: any[],
  playerGamePlayData: any,
  tableGamePlayData: any,
  playerData: UserProfile,
  currentRoundHistory: CurrentRoundTurnHistorySchema,
  networkParams?: networkParams,
) {
  Logger.info(`Normal drop game: ${tableConfigData._id}`, [
    tableConfigData,
    playersGamePlayData,
    playerGamePlayData,
    tableGamePlayData,
    playerData,
  ]);
  const {
    currentRound,
    maximumPoints,
    _id: tableId,
  } = tableConfigData;
  const { userId } = playerGamePlayData;

  const points = getDropPoints(
    playerGamePlayData.isFirstTurn,
    maximumPoints,
    tableConfigData.gameType,
    tableConfigData.maximumSeat,
  );

  const playingPlayers = getPlayingUserInRound(
    playersGamePlayData,
    true,
  ).filter((ele: any) => ele.userId !== userId);

  playerGamePlayData.gameEndReason =
    playerGamePlayData.gameEndReason ||
    getDropStatus(points, playerGamePlayData.isAutoDrop);
  playerGamePlayData.userStatus = PLAYER_STATE.DROP;
  playerGamePlayData.points = points;

  if (tableConfigData.gameType === RUMMY_TYPES.POOL) {
    playerGamePlayData.dealPoint += points;
  } else if (tableConfigData.gameType === RUMMY_TYPES.DEALS) {
    deductScoreForDeals(
      playerGamePlayData,
      tableGamePlayData,
      points,
    );
  } else {
    playerGamePlayData.dealPoint -= points;
  }

  tableGamePlayData.totalPlayerPoints += points;

  currentRoundHistory.turnsDetails[
    currentRoundHistory.turnsDetails.length - 1
  ].points = points;

  currentRoundHistory.turnsDetails[
    currentRoundHistory.turnsDetails.length - 1
  ].turnStatus = TURN_HISTORY.DROP;

  const currentTurnData: UpdateTurnDetailsSchema = {
    points,
    turnStatus: TURN_HISTORY.DROP,
  };

  await Promise.all([
    tableConfigurationService.setTableConfiguration(
      tableConfigData._id,
      tableConfigData,
    ),
    tableGameplayService.setTableGameplay(
      tableConfigData._id,
      currentRound,
      tableGamePlayData,
    ),
    playerGameplayService.setPlayerGameplay(
      userId,
      tableId,
      currentRound,
      playerGamePlayData,
    ),
    UpdateTurnDetails(tableId, currentRound, currentTurnData),
    turnHistoryService.setTurnHistory(
      tableId,
      currentRound,
      currentRoundHistory,
    ),
  ]);

  const tableResponse = {
    tableId,
    userId,
    totalPoints: playerGamePlayData.dealPoint,
    status: PLAYER_STATE.DROP.toLowerCase(),
  };
  validateDropCardRoomRes(tableResponse);

  Promise.all([
    socketOperation.sendEventToRoom(
      tableId,
      EVENTS.DROP_SOCKET_EVENT,
      tableResponse,
    ),
    eventStateManager.fireEventUser(
      tableId,
      userId,
      USER_EVENTS.DROP,
      networkParams?.timeStamp || dateUtils.getCurrentEpochTime(),
    ),
  ]);

  Logger.info('handleDrop: playing players', [playingPlayers]);

  // cancel player turn timer

  scheduler.cancelJob.playerTurnTimer(tableId, userId);

  /**
   * If available players are greater than 2 (before dropping this user)
   * proceed with drop and setup next turn
   */
  if (playingPlayers.length < 2) {
    // declare the winner
    await winner.handleWinner(
      playerGamePlayData,
      tableConfigData,
      tableGamePlayData,
    );
  } else {
    await changeTurn(tableConfigData._id);
  }
}

async function handleDropForPoints(
  tableConfigData: TableConfigDropGame,
  playersGamePlayData: any[],
  playerGamePlayData: any,
  tableGamePlayData: any,
  playerData: UserProfile,
  currentRoundHistory: CurrentRoundTurnHistorySchema,
  networkParams?: networkParams,
  option?: { dropAndSwitch?: boolean },
  socket?: any,
) {
  Logger.info(`Normal drop game points: ${tableConfigData._id}`, [
    tableConfigData,
    playersGamePlayData,
    playerGamePlayData,
    tableGamePlayData,
    playerData,
  ]);
  const {
    currentRound,
    maximumPoints,
    _id: tableId,
    currencyFactor,
  } = tableConfigData;
  const { userId } = playerGamePlayData;

  const points = getDropPoints(
    playerGamePlayData.isFirstTurn,
    maximumPoints,
    tableConfigData.gameType,
    tableConfigData.maximumSeat,
  );
  const pointsAsPerCF = roundInt(currencyFactor * points, 2);

  const currentTurnData: UpdateTurnDetailsSchema = {
    points: points,
    turnStatus:
      points === NUMERICAL.TWENTY
        ? TURN_HISTORY.DROP
        : TURN_HISTORY.MIDDLE_DROP,
  };

  currentRoundHistory.turnsDetails[
    currentRoundHistory.turnsDetails.length - 1
  ].points = points;

  currentRoundHistory.turnsDetails[
    currentRoundHistory.turnsDetails.length - 1
  ].turnStatus =
    points === NUMERICAL.TWENTY
      ? TURN_HISTORY.DROP
      : TURN_HISTORY.MIDDLE_DROP;

  const gameDetails = formatGameDetails(
    currentRound,
    tableGamePlayData,
    currentRoundHistory,
  );
  const dropUserData = {
    si: playerGamePlayData.seatIndex,
    userId: playerGamePlayData.userId,
    sessionId: playerGamePlayData.tableSessionId, // playerData.unitySessionId,
    score: -points,
    gameEndReason: GAME_END_REASONS.DROP, // scoreData
    roundEndReason:
      playerGamePlayData.gameEndReason ||
      GAME_END_REASONS_INSTRUMENTATION.DROP,
    decimalScore: roundInt(-points, 2),
    gameDetails,
    tableId,
    gameType: tableConfigData.gameType,
    lobbyId: tableConfigData.lobbyId,
    currentRound,
    startingUsersCount: tableGamePlayData.noOfPlayers,
  };

  // const grpcUpdateBattle = await grpcBattle.sendUpdateUserBattleScore(
  //   dropUserData,
  //   playerData.socketId,
  // );

  const userCashValue =
    playerData.userTablesCash.find(
      (utc: UserCashSchema) => utc.tableId === tableId,
    )?.userCash || 0;
  // let userLostCashValue = pointsAsPerCF;
  // if (grpcUpdateBattle.playerData) {
  //   playerGamePlayData.isPlayAgain =
  //     !!grpcUpdateBattle.playerData?.canPlayAgain;

  //   // update rummy wallet if autoDebited true
  //   const isAmountAutoDebited =
  //     grpcUpdateBattle.playerData?.pointRummyAutoDebit
  //       ?.isAutoDebitDone;
  //   if (isAmountAutoDebited) {
  //     const autoDebitAmount =
  //       grpcUpdateBattle.playerData?.pointRummyAutoDebit?.moneyDetail
  //         ?.amount;
  //     if (autoDebitAmount) {
  //       userLostCashValue -= Number(autoDebitAmount);

  //       sendAutoDebitInfo({
  //         socketId: playerData.socketId,
  //         tableId,
  //         userId,
  //         amount: autoDebitAmount,
  //         socket,
  //       });
  //       Logger.info(
  //         `handleDropForPoints: tableId: ${tableId} `,
  //         `pointRummyAutoDebit/amount ${autoDebitAmount},
  //           pointsAsPerCF: ${pointsAsPerCF}, userLostCashValue: ${userLostCashValue}`,
  //       );
  //     }
  //   }
  //   const userTableRummyWallet =
  //     grpcUpdateBattle.playerData?.pointRummyWallet?.amount;
  //   userCashValue = await setUserCash(
  //     tableId,
  //     userTableRummyWallet,
  //     'Card Drop Deduction',
  //     playerData,
  //     tableGamePlayData.seats,
  //   );
  //   const { socketId } = playerData;
  //   // update user balance
  //   userService.getUserBalance(
  //     userId,
  //     socketId,
  //     playerGamePlayData.tableSessionId || '',
  //   );
  // }

  playerGamePlayData.userStatus = PLAYER_STATE.DROP;
  playerGamePlayData.gameEndReason =
    playerGamePlayData.gameEndReason ||
    getDropStatus(points, playerGamePlayData.isAutoDrop);
  playerGamePlayData.points = points;
  playerGamePlayData.winningCash = -pointsAsPerCF;
  tableGamePlayData.potValue += pointsAsPerCF;
  tableGamePlayData.totalPlayerPoints += points;

  await Promise.all([
    tableConfigurationService.setTableConfiguration(
      tableConfigData._id,
      tableConfigData,
    ),
    tableGameplayService.setTableGameplay(
      tableConfigData._id,
      currentRound,
      tableGamePlayData,
    ),
    playerGameplayService.setPlayerGameplay(
      userId,
      tableId,
      currentRound,
      playerGamePlayData,
    ),
    UpdateTurnDetails(tableId, currentRound, currentTurnData),
    turnHistoryService.setTurnHistory(
      tableId,
      currentRound,
      currentRoundHistory,
    ),
  ]);

  const userProfileDataPromise = tableGamePlayData.seats.map((seat) =>
    userProfileService.getUserDetailsById(seat._id),
  );
  const userProfileData = await Promise.all(userProfileDataPromise);
  for (const user of userProfileData) {
    if (user) {
      const pointsForDrop = getDropPoints(
        playerGamePlayData.isFirstTurn,
        tableConfigData.maximumPoints,
        tableConfigData.gameType,
        tableConfigData.maximumSeat,
      );
      const potValue = tableConfigData.currencyFactor * pointsForDrop;
      if (!tableGamePlayData.potValue) tableGamePlayData.potValue = 0;
      tableGamePlayData.potValue += potValue;
      if (userId == user.id && option?.dropAndSwitch) {
        socketOperation.removeClientFromRoom(
          tableId,
          user.socketId,
        );
      }

      const tableResponse = {
        tableId,
        userId,
        totalPoints: points,
        status: PLAYER_STATE.DROP.toLowerCase(),
        potValue: tableGamePlayData.potValue,
        userCash: userCashValue,
        winningCash: -playerGamePlayData.winningCash,
      };
      validateDropCardRoomPointsRes(tableResponse);
      socketOperation.sendEventToClient(
        user.socketId,
        tableResponse,
        EVENTS.DROP_SOCKET_EVENT,
      );
    }
  }



  await Promise.all([
    tableGameplayService.setTableGameplay(
      tableConfigData._id,
      currentRound,
      tableGamePlayData,
    ),
    eventStateManager.fireEventUser(
      tableId,
      userId,
      USER_EVENTS.DROP,
      networkParams?.timeStamp || dateUtils.getCurrentEpochTime(),
    ),
  ]);

  // cancel player turn timer

  scheduler.cancelJob.playerTurnTimer(tableId, userId);

  if (option?.dropAndSwitch) {
    // switch table
    return await switchTable(
      {
        userId,
        tableId,
        isDropNSwitch: true,
      },
      socket,
    );
  }

  const playingPlayers = getPlayingUserInRound(
    playersGamePlayData,
    true,
  ).filter((ele: any) => ele.userId !== userId);
  Logger.info(`handleDropForPoints: playing players: ${tableId}`, [
    playingPlayers,
  ]);

  /**
   * If available players are greater than 2 (before dropping this user)
   * proceed with drop and setup next turn
   */
  if (playingPlayers.length < 2) {
    // declare the winner
    await winnerPoints.handleWinnerPoints(
      tableId,
      currentRound,
      playingPlayers[0].userId,
    );
  } else {
    await changeTurn(tableConfigData._id);
  }
}

async function handleInvalidDeclareDropPoints(
  tableConfigData: TableConfigDropGame,
  playersGamePlayData: PlayerGameplay[],
  playerGamePlayData: PlayerGameplay,
  tableGamePlayData: any,
  playerData: UserProfile,
  currentRoundHistory: CurrentRoundTurnHistorySchema,
) {
  Logger.info(
    `handleInvalidDeclareDropPoints: ${tableConfigData._id}`,
    [
      tableConfigData,
      playersGamePlayData,
      playerGamePlayData,
      tableGamePlayData,
      playerData,
    ],
  );

  const {
    _id: tableId,
    currentRound,
    currencyFactor,
  } = tableConfigData;
  const { userId } = playerGamePlayData;

  const points = POINTS.MAX_DEADWOOD_POINTS;
  const pointsAsPerCF = roundInt(currencyFactor * points, 2);

  const currentTurnData: UpdateTurnDetailsSchema = {
    points: points,
    turnStatus: TURN_HISTORY.INVALID_DECLARE,
  };

  currentRoundHistory.turnsDetails[
    currentRoundHistory.turnsDetails.length - 1
  ].points = points;

  currentRoundHistory.turnsDetails[
    currentRoundHistory.turnsDetails.length - 1
  ].turnStatus = TURN_HISTORY.INVALID_DECLARE;

  const gameDetails = formatGameDetails(
    currentRound,
    tableGamePlayData,
    currentRoundHistory,
  );

  const dropUserData = {
    si: playerGamePlayData.seatIndex,
    userId: playerGamePlayData.userId,
    sessionId: playerGamePlayData.tableSessionId, // playerData.unitySessionId,
    score: -points,
    gameEndReason: GAME_END_REASONS.INVALID_DECLARE, // scoreData
    roundEndReason: GAME_END_REASONS_INSTRUMENTATION.INVALID_DECLARE,
    decimalScore: roundInt(-points, 2),
    gameDetails,
    tableId,
    gameType: tableConfigData.gameType,
    lobbyId: tableConfigData.lobbyId,
    currentRound,
    startingUsersCount: tableGamePlayData.noOfPlayers,
  };
  const userCashValue =
    playerData.userTablesCash.find(
      (utc: UserCashSchema) => utc.tableId === tableId,
    )?.userCash || 0;

  playerGamePlayData.userStatus = PLAYER_STATE.LOST;
  playerGamePlayData.gameEndReason =
    playerGamePlayData.gameEndReason ||
    GAME_END_REASONS_INSTRUMENTATION.LOST;
  playerGamePlayData.invalidDeclare = true;
  playerGamePlayData.points = points;
  tableGamePlayData.potValue += pointsAsPerCF;
  playerGamePlayData.winningCash = -pointsAsPerCF;

  tableGamePlayData.totalPlayerPoints += points;
  tableGamePlayData.tableState = TABLE_STATE.ROUND_STARTED;

  await Promise.all([
    tableConfigurationService.setTableConfiguration(
      tableConfigData._id,
      tableConfigData,
    ),
    tableGameplayService.setTableGameplay(
      tableConfigData._id,
      currentRound,
      tableGamePlayData,
    ),
    playerGameplayService.setPlayerGameplay(
      userId,
      tableId,
      currentRound,
      playerGamePlayData,
    ),
    UpdateTurnDetails(tableId, currentRound, currentTurnData),
    turnHistoryService.setTurnHistory(
      tableId,
      currentRound,
      currentRoundHistory,
    ),
  ]);
  const tableResponse = {
    tableId,
    userId,
    totalPoints: playerGamePlayData.dealPoint,
    status: PLAYER_STATE.LOST.toLowerCase(),
    potValue: tableGamePlayData.potValue,
    userCash: userCashValue,
    winningCash: playerGamePlayData.winningCash,
  };
  validateDropCardRoomPointsRes(tableResponse);

  await Promise.all([
    socketOperation.sendEventToRoom(
      tableId,
      EVENTS.DROP_SOCKET_EVENT,
      tableResponse,
    ),
    eventStateManager.fireEventUser(
      tableId,
      userId,
      USER_EVENTS.FINISH,
      dateUtils.getCurrentEpochTime(),
    ),
  ]);

  const playingPlayers = getPlayingUserInRound(
    playersGamePlayData,
    true,
  ).filter((ele) => ele && ele.userId !== userId);
  Logger.info('handleInvalidDeclareDropPoints: playing players', [
    playingPlayers,
  ]);

  /**
   * If table has only two activePlayers (incl player who did invalid declare)
   * perform rummy format specific action
   */
  if (playingPlayers.length < 2) {
    // declare the winner
    playerGameplayService.setPlayerGameplay(
      userId,
      tableId,
      currentRound,
      playerGamePlayData,
    ),
      await winnerPoints.handleWinnerPoints(
        tableId,
        currentRound,
        playingPlayers[0].userId,
      );
  } else {
    await changeTurn(tableId);
  }
}

/**
 * Droping user from game (user can't play but will not leave the seat)
 * calculating points for user who dropped
 * This will called when:
 * 1. user finish with invalid declare
 * 2. user click on drop (first drop / middle drop)
 * 3. user's maximum timeout limit reached
 */
export async function dropGame(
  data: {
    tableId: string;
    dropAndSwitch?: boolean;
  },
  client: any,
  reason?: string,
  networkParams?: networkParams,
) {
  let lock!: Lock;
  try {
    const { userId } = client;
    const { tableId } = data;
    Logger.info('dropGame: ', [data, userId, reason]);
    validateDropCardReq(data);

    // reason is empty from request handler
    if (!reason) {
      lock = await redlock.Lock.acquire([`lock:${tableId}`], 5000);
      Logger.info(
        `Lock acquired, in dropGame on resource:, ${lock.resource}`,
      );
    }

    const tableData =
      (await tableConfigurationService.getTableConfiguration(
        tableId,
        [
          '_id',
          'currentRound',
          'gameType',
          'currencyFactor',
          'lobbyId',
          'gameId',
          'maximumSeat',
          'maximumPoints',
          "currencyType",
          "bootValue"
        ],
      )) as any;
    const { currentRound, gameId, maximumPoints, currencyType, bootValue, maximumSeat } = tableData;

    const [
      tableGamePlayData,
      userProfileData,
      turnHistory,
    ]: Array<any> = await Promise.all([
      tableGameplayService.getTableGameplay(tableId, currentRound, [
        '_id',
        'seats',
        'currentTurn',
        'createdAt',
        'updatedAt',
        'trumpCard',
        'noOfPlayers',
        'potValue',
        'totalPlayerPoints',
        'tableState',
        'pointsForRoundWinner',
        'declarePlayer',
      ]),
      userProfileService.getOrCreateUserDetailsById(userId),
      turnHistoryService.getTurnHistory(tableId, currentRound),
    ]);

    let playersGameData = await Promise.all(
      tableGamePlayData.seats.map((e: any) =>
        playerGameplayService.getPlayerGameplay(
          e._id,
          tableId,
          currentRound,
          [
            'userId',
            'userStatus',
            'currentCards',
            'dealPoint',
            'gameEndReason',
            'isFirstTurn',
            'seatIndex',
            'tableSessionId',
            'isAutoDrop',
            'winningCash',
          ],
        ),
      ),
    );
    playersGameData = playersGameData.filter((e) => e);
    const playerGameData =
      playersGameData.find((e) => e.userId === userId) || ({} as any);


    sendDropMixpanel(
      currencyType,
      gameId,
      maximumPoints,
      bootValue,
      userId,
      tableId,
      currentRound,
      maximumSeat,
      userProfileData.isBot,
      true,
      false
    );
    /**
     * If ROUND_STARTED &&
     * User is not already Droped &&
     * It's user's turn
     */
    const isUserPlaying =
      playerGameData.userStatus === PLAYER_STATE.PLAYING ||
      playerGameData.userStatus === PLAYER_STATE.FINISH;
    if (
      isUserPlaying &&
      userId === tableGamePlayData.currentTurn &&
      playerGameData.currentCards.length === NUMERICAL.THIRTEEN
    ) {
      switch (reason) {
        case GAME_END_REASONS.INVALID_DECLARE:
          if (isPointsRummyFormat(tableData.gameType)) {
            await handleInvalidDeclareDropPoints(
              tableData,
              playersGameData,
              playerGameData,
              tableGamePlayData,
              userProfileData,
              turnHistory,
            );
          } else {
            await handleInvalidDeclareDrop(
              tableData,
              playersGameData,
              playerGameData,
              tableGamePlayData,
              userProfileData,
              turnHistory,
            );
          }
          break;
        default:
          if (isPointsRummyFormat(tableData.gameType)) {
            await handleDropForPoints(
              tableData,
              playersGameData,
              playerGameData,
              tableGamePlayData,
              userProfileData,
              turnHistory,
              networkParams,
              {
                dropAndSwitch: data?.dropAndSwitch,
              },
              client,
            );
          } else {
            await handleDrop(
              tableData,
              playersGameData,
              playerGameData,
              tableGamePlayData,
              userProfileData,
              turnHistory,
              networkParams,
            );
          }
      }
    }
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR dropGame:, ${client?.userId}, ${data?.tableId}`, [
      error,
    ]);
    if (error instanceof CancelBattleError) {
      await cancelBattle.cancelBattle(data.tableId, error);
    }
  } finally {
    try {
      if (lock && lock instanceof Lock) {
        await redlock.Lock.release(lock);
        Logger.info(
          `Lock releasing, in dropGame; resource:, ${lock.resource}`,
        );
      }
    } catch (err: any) {
      Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on dropGame: ${err}`);
    }
  }
}

export async function handleAutoDrop(
  data: {
    tableId: string;
    autoDropEnable: boolean;
    dropAndSwitch?: boolean;
  },
  client: any,
) {
  let lock!: Lock;
  try {
    const { userId } = client;
    const { tableId, autoDropEnable, dropAndSwitch } = data;
    Logger.info('auto drop: ', [data, userId]);
    validateAutoDropCardReq(data);

    lock = await redlock.Lock.acquire([`lock:${tableId}`], 5000);
    Logger.info(
      `Lock acquired, in auto drop on resource:, ${lock.resource}`,
    );

    const tableData: any =
      await tableConfigurationService.getTableConfiguration(tableId, [
        'currentRound',
      ]);
    const { currentRound } = tableData;

    const playerGameplayData =
      await playerGameplayService.getPlayerGameplay(
        userId,
        tableId,
        currentRound,
        ['isAutoDrop', 'isAutoDropSwitch'],
      );
    if (!playerGameplayData) {
      throw new Error(`Player gameplay data not found`);
    }
    playerGameplayData.isAutoDrop = autoDropEnable;
    playerGameplayData.isAutoDropSwitch = !!dropAndSwitch;

    await playerGameplayService.setPlayerGameplay(
      userId,
      tableId,
      currentRound,
      playerGameplayData,
    );
    return {
      tableId,
      autoDropEnable,
    };
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR dropGame:, ${client?.userId}, ${data?.tableId}, ${error.message}`,
      [error],
    );
    if (error instanceof CancelBattleError) {
      await cancelBattle.cancelBattle(data.tableId, error);
    }
  } finally {
    try {
      if (lock && lock instanceof Lock) {
        await redlock.Lock.release(lock);
        Logger.info(
          `Lock releasing, in dropGame; resource:, ${lock.resource}`,
        );
      }
    } catch (err: any) {
      Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on dropGame: ${err}`);
    }
  }
}
