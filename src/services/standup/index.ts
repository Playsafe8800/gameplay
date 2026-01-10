import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import _ from 'underscore';
import {
  EVENTS,
  PLAYER_STATE,
  POINTS,
  TABLE_STATE,
} from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { userProfileService } from '../../db/userProfile';
import { PlayerGameplay, UserProfile } from '../../objectModels';
import LeaveTableHandler from '../../services/leaveTable';
import { socketOperation } from '../../socketHandler/socketOperation';
import { roundInt } from '../../utils';
import { CancelBattleError } from '../../utils/errors';
import { redlock } from '../../utils/lock/redlock';
import { validateStandupRoomRes } from '../../validators/response.validator';
import { cancelBattle } from '../gameplay/cancelBattle';
import { scheduler } from '../schedulerQueue';
import { shuffleOpenDeck } from '../gameplay/ShuffleOpenDeck';

export async function standup(data: {
  userId: number;
  tableId: string;
  reason?: string;
  isDropNStandup?: boolean;
}) {
  const { userId, tableId } = data;
  let lock!: Lock;
  try {
    if (!data?.isDropNStandup) {
      lock = await redlock.Lock.acquire([`lock:${tableId}`], 3000);
      Logger.info(`lock acquire in standup resource: ${tableId}}`);
    }

    const tableConfigData: any =
      await tableConfigurationService.getTableConfiguration(tableId, [
        '_id',
        'currentRound',
        'gameType',
        'lobbyId',
        'minimumSeat',
        'currencyFactor',
      ]);
    const { currentRound } = tableConfigData;
    const [
      tableGamePlayData,
      playerGamePlayData,
      userProfileData,
    ]: Array<any> = await Promise.all([
      tableGameplayService.getTableGameplay(tableId, currentRound, [
        'noOfPlayers',
        'tableState',
        'currentTurn',
        'seats',
        'standupUsers',
        'declarePlayer',
        'potValue',
        'opendDeck',
        'totalPlayerPoints',
        'closedDeck',
      ]),
      playerGameplayService.getPlayerGameplay(
        userId,
        tableId,
        currentRound,
        ['userId', 'userStatus', 'seatIndex', 'points'],
      ),
      userProfileService.getUserDetailsById(userId),
    ]);

    Logger.info(
      `Standup request reason: ${data?.reason} >> User Table >> \n`,
      [
        tableConfigData,
        ' \n >> Table Game Play >> \n',
        tableGamePlayData,
        '\n >> Player Game Play >> \n',
        playerGamePlayData,
      ],
    );

    const { tableState } = tableGamePlayData;
    const canNotStandupStates = [
      TABLE_STATE.LOCK_IN_PERIOD,
      TABLE_STATE.DECLARED,
    ];

    const safeStates = [
      TABLE_STATE.WAITING_FOR_PLAYERS,
      TABLE_STATE.ROUND_TIMER_STARTED,
      TABLE_STATE.WINNER_DECLARED,
    ];

    const safePlayerStates = [PLAYER_STATE.DROP, PLAYER_STATE.LOST];
    let isDeckShuffled = false;

    if (tableGamePlayData?.closedDeck?.length === 0) {
      await shuffleOpenDeck({
        tableGamePlayData,
        tableId,
        currentRound,
      });

      isDeckShuffled = true;
    }

    const isUserStandup = tableGamePlayData.standupUsers.find(
      (user: any) => user._id.toString() === userId.toString(),
    );
    if (
      isUserStandup ||
      playerGamePlayData.userStatus === PLAYER_STATE.WATCHING
    ) {
      Logger.error(
        `INTERNAL_SERVER_ERROR _VALIDATION_: player ${userId} cannot standup 
        beacasue already standup from ${tableId} having tableState ${tableState}`,
      );
      return false;
    } else if (canNotStandupStates.includes(tableState)) {
      Logger.error(
        `INTERNAL_SERVER_ERROR _VALIDATION_: player ${userId}  cannot standup at lock in Period or declare phase 
        from ${tableId} having tableState ${tableState}`,
      );
      return false;
    } else if (
      safeStates.includes(tableState) ||
      safePlayerStates.includes(playerGamePlayData.userStatus)
    ) {
      Logger.info(
        `User ${userId} standup on table ${tableId} when game was not started or winner declared 
        or user status could be drop/lost: ${playerGamePlayData.userStatus}`,
      );
      await updateTGPandPGPandUserProfile(
        userId,
        tableId,
        tableConfigData,
        tableGamePlayData,
        userProfileData,
        true,
        {
          playerGamePlay: playerGamePlayData,
        },
      );

      const tableResp = {
        tableId: tableId,
        userId: userId,
        userCash: userProfileData.userCash,
        totalPoints: 0,
        potValue: tableGamePlayData.potValue || 0,
      };
      validateStandupRoomRes(tableResp);

      socketOperation.sendEventToRoom(
        tableId,
        EVENTS.STNDUP_SOCKET_EVENT,
        tableResp,
      );

      // managePlayerOnLeave - call winner or chnage turn
      LeaveTableHandler.managePlayerOnLeave(
        tableConfigData,
        tableGamePlayData,
        isDeckShuffled,
        playerGamePlayData,
      );
    } else {
      Logger.error(`standup in else ${tableId}:${userId}`);
    }
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR _CATCH_ERROR_: Error from Standup: ${error}`, [
      error,
    ]);
    if (error instanceof CancelBattleError) {
      cancelBattle.cancelBattle(data.tableId, error);
      return;
    }
    throw error;
  } finally {
    try {
      if (lock && lock instanceof Lock) {
        await redlock.Lock.release(lock);
        Logger.info(
          `Lock releasing, in standup; resource:, ${lock.resource}`,
        );
      }
    } catch (err: any) {
      Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on standup: ${err}`);
    }
  }
}

export async function updateTGPandPGPandUserProfile(
  userId: number,
  tableId: string,
  tableConfigurationData: any,
  tableGameplayData: any,
  userInfo: UserProfile,
  gameDidNotStart: boolean,
  optionalObj?: {
    playerGamePlay?: PlayerGameplay;
    remainingCard?: string;
    lostPoints?: number;
  },
): Promise<void> {
  try {
    const { currentRound, minimumSeat, currencyFactor } =
      tableConfigurationData;
    const { seats } = tableGameplayData;

    if (tableGameplayData.noOfPlayers)
      tableGameplayData.noOfPlayers -= 1;

    // standup before start game or winner declared or userStatus drop/lost
    if (gameDidNotStart) {
      Logger.info(`TGP seats >> ${tableId}`, [
        seats.length,
        `minimum seats ${minimumSeat}`,
      ]);

      if (
        tableGameplayData?.standupUsers &&
        optionalObj?.playerGamePlay
      ) {
        tableGameplayData.standupUsers.push({
          _id: userId,
          seat: optionalObj.playerGamePlay?.seatIndex,
        });
        tableGameplayData.standupUsers = _.uniq(
          tableGameplayData.standupUsers,
          (x) => x._id,
        );
      }

      if (
        tableGameplayData.tableState ===
          TABLE_STATE.WAITING_FOR_PLAYERS ||
        tableGameplayData.tableState ===
          TABLE_STATE.ROUND_TIMER_STARTED
      ) {
        seats.forEach((e) => {
          if (e._id === userId) {
            e._id = null as any;
          }
        });

        let seatedPlayerCount = 0;
        seats.forEach((e: any) => {
          if (e._id === userId) {
            e._id = null;
          } else if (e._id) seatedPlayerCount += 1;
        });

        tableGameplayData.noOfPlayers = seatedPlayerCount;
        if (seatedPlayerCount <= minimumSeat) {
          tableGameplayData.tableState =
            TABLE_STATE.WAITING_FOR_PLAYERS;
          await scheduler.cancelJob.tableStart(tableId);
        }
      }
    } else {
      // standup in game
      const playerGamePlayData =
        optionalObj?.playerGamePlay || ({} as any);

      if (optionalObj?.remainingCard)
        tableGameplayData.opendDeck.push(optionalObj.remainingCard);

      if (
        tableGameplayData.tableState === TABLE_STATE.ROUND_STARTED
      ) {
        const totalPoints =
          optionalObj?.lostPoints || POINTS.MAX_DEADWOOD_POINTS;
        const pointsAsPerCF = roundInt(
          currencyFactor * totalPoints,
          2,
        );
        tableGameplayData.potValue += pointsAsPerCF;
        tableGameplayData.totalPlayerPoints += totalPoints;
        playerGamePlayData.points = totalPoints;
      }

      playerGamePlayData.userStatus = PLAYER_STATE.WATCHING;
      await playerGameplayService.setPlayerGameplay(
        userId,
        tableId,
        currentRound,
        playerGamePlayData,
      );
    }

    await userProfileService.setUserDetails(userId, userInfo);
    await tableGameplayService.setTableGameplay(
      tableId,
      currentRound,
      tableGameplayData,
    );
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR LeaveTableHandler.updateRedis ${error.message} `, [
      error,
    ]);
    throw error;
  }
}
