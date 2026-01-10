import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import { zk } from '../../connections';
import { EVENTS, POINTS, TABLE_STATE } from '../../constants';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { userProfileService } from '../../db/userProfile';
import { networkParams } from '../../objectModels/playerGameplay';
import { socketOperation } from '../../socketHandler/socketOperation';
import { roundInt } from '../../utils';
import { CancelBattleError } from '../../utils/errors';
import { redlock } from '../../utils/lock/redlock';
import { cancelBattle } from '../gameplay/cancelBattle';
import { tableOperation } from '../signUp/tableOperation';

export async function joinBack(
  data: {
    tableId: string;
  },
  socket: any,
  networkParams?: networkParams,
) {
  const { tableId } = data;
  const { userId } = socket;

  const lockStates = [
    TABLE_STATE.LOCK_IN_PERIOD,
    TABLE_STATE.WINNER_DECLARED,
    TABLE_STATE.ROUND_STARTED,
    // -------------- temp lock states ---------------
  ];

  const freeStates = [
    TABLE_STATE.WAITING_FOR_PLAYERS,
    TABLE_STATE.ROUND_TIMER_STARTED,
  ];

  let lock!: Lock;
  try {
    // this lock secure three flows, joinback, insertNewPlayer and GameTableInitiation
    lock = await redlock.Lock.acquire([`lock:${tableId}`], 3000);
    Logger.info(`Lock acquire in joinback: ${lock.resource}`);

    const tableConfigData =
      await tableConfigurationService.getTableConfiguration(tableId, [
        'maximumPoints',
        '_id',
        'bootValue',
        'currentRound',
        'lobbyId',
        'currencyType',
        'dealsCount',
        'gameType',
        'maximumSeat',
        'currentRound',
        'minimumSeat',
        'gameStartTimer',
        'bootValue',
      ]);
    const { currentRound } = tableConfigData; // need to get or update latest round

    const [tableGamePlayData, userProfile]: Array<any> =
      await Promise.all([
        tableGameplayService.getTableGameplay(tableId, currentRound, [
          'standupUsers',
          'tableState',
          'seats',
        ]),
        userProfileService.getUserDetailsById(userId),
      ]);

    const { tableState, seats } = tableGamePlayData;
    const currentPlayersInTable = seats.filter(
      (ele: any) => ele._id,
    ).length;

    if (lockStates.includes(tableState)) {
      socketOperation.sendEventToClient(
        socket,
        {
          cta: 'cnsp', // can not sit in playing
          msg: zk.getConfig().CNSP,
        },
        EVENTS.OPEN_GAME_POPUP_SOCKET_EVENT,
      );
    } else if (
      currentPlayersInTable === tableConfigData.maximumSeat
    ) {
      socketOperation.sendEventToClient(
        socket,
        {
          cta: 'sfm',
          msg: zk.getConfig().SFM,
        },
        EVENTS.OPEN_GAME_POPUP_SOCKET_EVENT,
      );
    } else if (
      freeStates.includes(tableState) &&
      currentPlayersInTable < tableConfigData.maximumSeat
    ) {
      const minCashValue =
        tableConfigData.bootValue * POINTS.MAX_DEADWOOD_POINTS;
      userProfile.userCash = roundInt(userProfile.userCash, 2);

      if (userProfile.userCash < minCashValue) {
        // alertPopup.InsufficientFundWithAddCash(
        //   socket,
        //   zk.getConfig().IPM,
        //   INSUFFICIENT_FUND_REASONS.JOIN_BACK_AFTER_STAND_UP_IFE,
        //   {
        //     apkVersion: Number(userProfile.apkVersion),
        //     tableId,
        //     userId: userId.toString(),
        //   },
        // );
        return false;
      }

      const newStdP = tableGamePlayData.standupUsers.filter(
        (stData: any) => stData._id !== userId,
      );

      tableGamePlayData.standupUsers = newStdP;
      await tableGameplayService.setTableGameplay(
        tableId,
        currentRound,
        tableGamePlayData,
      );

      const gtiData = await tableOperation.insertNewPlayer(
        socket,
        userProfile,
        tableConfigData,
        true,
        networkParams,
      );

      const response = {
        signupResponse: {
          userId,
          username: userProfile.userName,
          profilePicture: userProfile.avatarUrl,
        },
        gameTableInfoData: [gtiData],
      };
      return response;
    }
  } catch (error: any) {
    Logger.error('INTERNAL_SERVER_ERROR _CATCH_ERROR_: on joinback', [error]);
    if (error instanceof CancelBattleError) {
      cancelBattle.cancelBattle(data.tableId, error);
    }
    throw error;
  } finally {
    try {
      if (lock && lock instanceof Lock) {
        await redlock.Lock.release(lock);
        Logger.info(
          `Lock releasing, in joinback; resource:, ${lock.resource}`,
        );
      }
    } catch (err: any) {
      Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on joinback: ${err}`);
    }
  }
}
