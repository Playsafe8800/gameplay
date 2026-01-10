import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import { zk } from '../../connections';
import {
  EVENTS,
  GAME_END_REASONS,
  NUMERICAL,
  PLAYER_STATE,
  SPLIT,
  SPLIT_STATUS,
  STRINGS,
  TABLE_STATE,
} from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { roundScoreBoardService } from '../../db/roundScoreBoard';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { userProfileService } from '../../db/userProfile';
import {
  PlayerGameplay,
  SplitAcceptRejectReq,
  SplitPopupReq,
  SplitPopupRes,
  UserProfile,
} from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import { deductRake } from '../../utils/deductRake';
import { getRandomUUID } from '../../utils/getRandomUUID';
import { redlock } from '../../utils/lock/redlock';
import { mutantService } from '../mutant';
import { scheduler } from '../schedulerQueue';
import { turnHistoryService } from '../../db/turnHistory/index';
import { getIdPrefix } from '../../utils';
class SplitHandler {
  async splitPopup(
    data: SplitPopupReq,
    socket: any,
  ): Promise<SplitPopupRes> {
    try {
      const { tableId } = data;
      if (!tableId)
        throw new Error('tableId not found from splitPopup');

      Logger.info(
        `split popup request for table: ${tableId}, userId: ${socket?.userId}`,
      );

      return {
        tableId,
        message: SPLIT.POPUP_MSG,
      };
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR Error found from splitPopup: ${error.message}`, [
        error,
      ]);
      throw error;
    }
  }

  async handleSplitAcceptReject(
    data: SplitAcceptRejectReq,
    socket: any,
  ): Promise<any> {
    let lock!: Lock;
    try {
      const { tableId, splitStatus } = data;
      const { userId } = socket;
      if (!tableId || !userId)
        throw new Error(
          `tableId or userId not found from handleSplitAcceptReject`,
        );
      // lock acquire
      lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
      const tableConfigData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          [
            '_id',
            'currentRound',
            'gameType',
            'lobbyId',
            'rakePercentage',
            'maximumPoints',
            'rebuyUsed',
            'isNewGameTableUI',
          ],
        );
      if (!tableConfigData)
        throw new Error(
          `tableConfigData not found for table: ${tableId} from handleSplitAcceptReject`,
        );
      const { currentRound } = tableConfigData;

      let responseData: any = null;
      if (splitStatus === SPLIT_STATUS.ACCEPTED) {
        responseData = await this.handleSplitAccept(
          userId,
          tableConfigData,
        );
      } else {
        // if even one user declined the split offer. we remove the data
        responseData = await this.handleSplitReject(
          userId,
          tableConfigData,
        );
      }
      if (!responseData) {
        Logger.error(`INTERNAL_SERVER_ERROR responseData null for table: ${tableId}`);
        return false;
      }
      Logger.error(
        `handleSplitAcceptReject: table: ${tableId}, responseData: `,
        [responseData],
      );

      await tableGameplayService.updateSplitRequest(
        tableId,
        responseData,
      );

      const { isSplitable, result }: any = responseData;
      delete responseData.isSplitable;
      delete responseData.result;
      let grpcRes;
      if (responseData.grpcRes) {
        grpcRes = responseData.grpcRes;
        delete responseData.grpcRes;
      }
      if (responseData) {
        socketOperation.sendEventToRoom(
          tableId,
          EVENTS.SPLIT_INFORMATION,
          responseData,
        );
      }

      if (result === NUMERICAL.ONE) {
        /**
         * getting data
         */
        const tableGameData =
          await tableGameplayService.getTableGameplay(
            tableId,
            currentRound,
            ['tableState'],
          );

        tableGameData.tableState = TABLE_STATE.PLAY_MORE;
        /**
         * saving table state
         */

        await tableGameplayService.setTableGameplay(
          tableId,
          currentRound,
          tableGameData,
        );

        // cancelling timer
        scheduler.cancelJob.tableStart(tableId);
        scheduler.cancelJob.roundStart(tableId);
        scheduler.cancelJob.roundTimerStart(tableId, currentRound);
        scheduler.cancelJob.initialTurnSetup(tableId, currentRound);
        if (
          responseData.tableGamePlayData &&
          responseData.playersGamePlayData
        ) {
          await this.buildGameDataForSplit(
            tableConfigData,
            responseData.tableGamePlayData.seats?.length,
            responseData.playersGamePlayData,
          );
        }
        // set playMoreDelayTimer
        // scheduler.addJob.playMoreDelay(
        //   tableId,
        //   tableGameData,
        //   isSplitable.playingPlayers,
        //   grpcRes,
        //   tableConfigData,
        // );

        // send updated final round scoreboard after split accepted for newUI
        if (tableConfigData?.isNewGameTableUI) {
          const winnerData =
            await roundScoreBoardService.getRoundScoreBoard(
              tableId,
              currentRound - 1,
            );
          if (winnerData?.playerInfo?.length) {
            const splitAcceptedUserIds = responseData?.playerInfo
              ? responseData?.playerInfo.map((pl) => {
                  if (pl.splitStatus) return pl.userId;
                })
              : [];
            winnerData.tableState = TABLE_STATE.WINNER_DECLARED;
            winnerData.split = false;
            winnerData.splitAmountPerPlayer = 0;
            winnerData.splitUsers = [];
            winnerData.playerInfo.forEach((player) => {
              const grpcPlayerData = grpcRes?.playersData.find(
                (p: any) => p.userId === player.userId,
              );
              player.rank = grpcPlayerData.rank || 0;
              if (splitAcceptedUserIds.includes(player.userId)) {
                player.winAmount = responseData.amount;
              }
            });
            winnerData!.playerInfo =
              await mutantService.addTenantToPlayerInfo(
                winnerData!.playerInfo,
              );
            await socketOperation.sendEventToRoom(
              tableId,
              EVENTS.ROUND_FINISH_SCOREBOARD,
              winnerData,
            );
          }
        }
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error found from handleSplitAcceptReject: ${error.message}`,
        [error],
      );
      return {
        success: false,
        error: error.message,
        data: { tableId: data?.tableId || '' },
      };
    } finally {
      try {
        if (lock && lock instanceof Lock) {
          await redlock.Lock.release(lock);
          Logger.info(
            `Lock releasing, in handleSplitAcceptReject; resource:, ${lock.resource}`,
          );
        }
      } catch (err: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock on handleSplitAcceptReject: `,[err]
        );
      }
    }
  }

  async buildGameDataForSplit(
    tableData: any,
    totalSeats: number,
    playersGameData: PlayerGameplay[],
  ): Promise<void> {
    const { _id: tableId, currentRound, gameType } = tableData;
    const roundHistory = await turnHistoryService.getTurnHistory(
      tableId,
      currentRound - 1, // new round is already created
    );
    const gameDataKafkaPartitionKey =
      zk.getConfig().GAME_DATA_KAFKA_PARTITION_KEY;
    const gameDataKafkaTopic = zk.getConfig().GAME_DATA_KAFKA_TOPIC;
    const gameEndReasonMap: { [key: number]: string } = {};
    const lobbyDetails: object = {};
    playersGameData.forEach((player) => {
      if (!player) {
        throw new Error(`PlayerGamePlay not found, ${tableId}`);
      }
      if (player.userStatus === PLAYER_STATE.PLAYING) {
        roundHistory.winnerId = player.userId; // winner id can be either of all players
        gameEndReasonMap[player.userId] = GAME_END_REASONS.WON;
        lobbyDetails[String(player.userId)] = tableData.lobbyId;
      }
    });
    const gameData = {
      timestamp: Date.now(),
      key: gameDataKafkaPartitionKey,
      payload: {
        tableId: `${getIdPrefix(gameType)}-${tableId}`,
        roundNo: roundHistory.roundNo,
        finalRound: true,
        roundId: '',
        gameData: {
          startingUsersCount: totalSeats,
          lobbyId: lobbyDetails, // check multi lobby
          rummyType: tableData.gameType,
          uniqueId: `${tableId}-${currentRound}`,
          gameEndReason: gameEndReasonMap,
          gameDetails: [roundHistory],
        },
      },
    };
    // kafkaServiceHelper.sendToKafka(
    //   tableData.gameType,
    //   gameDataKafkaTopic,
    //   gameDataKafkaPartitionKey,
    //   gameData,
    // );
  }
  async handleSplitAccept(userId: number, tableConfigData: any) {
    Logger.info(`handleSplitAccept: userId: ${userId}`, [
      tableConfigData,
    ]);
    const { currentRound, _id: tableId } = tableConfigData;

    const tableGamePlayData =
      await tableGameplayService.getTableGameplay(
        tableId,
        currentRound,
        ['splitUserId', 'seats', 'splitCount', 'potValue'],
      );
    if (!tableGamePlayData)
      throw new Error(
        `TableGamePlayData doesn't exist for tableid ${tableId}`,
      );
    if (tableGamePlayData.tableState === TABLE_STATE.PLAY_MORE)
      throw new Error(
        `Table split already completed for tableid ${tableId}`,
      );

    let { splitUserId } = tableGamePlayData;
    const { seats } = tableGamePlayData;

    if (!splitUserId) {
      tableGamePlayData.splitUserId = userId;
      splitUserId = userId;
    }

    const usersDataPromise = seats.map((seat: any) =>
      userProfileService.getUserDetailsById(seat._id),
    );
    const pgpDataPromise = seats.map((seat: any) =>
      playerGameplayService.getPlayerGameplay(
        seat._id,
        tableId,
        currentRound,
        ['userId', 'dealPoint', 'split', 'userStatus', 'points'],
      ),
    );

    const usersData: Array<UserProfile | null> = await Promise.all(
      usersDataPromise,
    );
    const playersGamePlayData: Array<any | null> = await Promise.all(
      pgpDataPromise,
    );
    const playersInfo: any = usersData.filter(Boolean);

    const splitUsername = playersInfo.find(
      (p: any) => p.id === tableGamePlayData.splitUserId,
    ).userName;

    const isSplitable = await this.isTableSplitable(
      playersGamePlayData,
      tableConfigData,
    );

    const eliminatedPlayers = isSplitable.eliminatedPlayers.map(
      (ele: any) => ele.userId,
    );

    if (!(isSplitable && isSplitable.splitType)) {
      Logger.error(
        `INTERNAL_SERVER_ERROR table is not splitable from handleSplitAccept,
        userId: ${userId}`,
        [isSplitable, tableConfigData],
      );
      return null;
    }

    const playerGameData: any = playersGamePlayData.find(
      (player) => player?.userId === userId,
    );

    if (playerGameData?.split !== NUMERICAL.ONE) {
      tableGamePlayData.splitCount += 1;
    }
    playerGameData.split = NUMERICAL.ONE;

    const playerInfoRes: any = [];
    isSplitable.playingPlayers.forEach((player: any) => {
      const { split } = player;
      const splitStatus = this.getSplitStatus(split);

      playerInfoRes.push({
        userId: player.userId,
        username: playersInfo.find((p: any) => p.id === player.userId)
          .userName,
        splitStatus,
        points: player.points,
        totalPoints: player.dealPoint,
      });
    });

    const perPlayerAmount =
      tableGamePlayData.potValue / isSplitable.playingPlayers.length;
    const splitAmount = deductRake(
      perPlayerAmount,
      tableConfigData.rakePercentage,
    );
    Logger.info(
      `handleSplitAccept amount: ${splitAmount}, ${perPlayerAmount}, ${tableConfigData.rakePercentage}, ${tableId}`,
    );

    /**
     * saving split data
     */
    await Promise.all([
      playerGameplayService.setPlayerGameplay(
        userId,
        tableId,
        currentRound,
        playerGameData,
      ),
      tableGameplayService.setTableGameplay(
        tableId,
        currentRound,
        tableGamePlayData,
      ),
    ]);

    Logger.info(
      `handleSplitAccept: splitCount: ${tableGamePlayData.splitCount}, 
      split playing users: `,
      [isSplitable.playingPlayers, tableId],
    );

    if (
      tableGamePlayData.splitCount >=
      isSplitable.playingPlayers.length
    ) {
      // cancelling RTS
      scheduler.cancelJob.tableStart(tableId);
      scheduler.cancelJob.roundStart(tableId);

      const sendData: any = [];
      const battleId = `${STRINGS.RPOM}-${tableId}`;
      for (let i = 0; i < isSplitable.playingPlayers.length; i++) {
        const playerGameDataLocal = isSplitable.playingPlayers[i];
        const scoreData = {
          gameEndReason: playerGameDataLocal.userStatus,
          rummyType: tableConfigData.gameType,
          lobbyId: tableConfigData.lobbyId,
          uniqueId: battleId,
          startingUsersCount: tableGamePlayData.seats.filter(
            (seat: any) => seat._id,
          ).length,
        };
        const jsonObject = {
          requestId: getRandomUUID(),
          battleId,
          userId: playerGameDataLocal.userId,
          score: playerGameDataLocal.dealPoint,
          scoreData: JSON.stringify(scoreData),
          isFirstScore: false,
          partnerKey: '',
          decimalScore: playerGameDataLocal.dealPoint,
          lobbyId: tableConfigData.lobbyId,
        };
        sendData.push(jsonObject);
      }

      // GRPC request
      // const grpcRes = await grpcSplit.splitRequest(
      //   battleId,
      //   tableConfigData.lobbyId,
      //   sendData,
      //   tableConfigData.cgsClusterName,
      // );

      // Logger.info(
      //   `handleSplitAccept: splitRequest response data: `,
      //   grpcRes,
      //   tableId,
      // );

      // if (!grpcRes || grpcRes?.error) {
      //   Logger.error('split grpc error: ', grpcRes, tableId);

      //   return {
      //     tableId,
      //     eliminatedUsers: eliminatedPlayers,
      //     userId: tableGamePlayData.splitUserId,
      //     username: splitUsername,
      //     playerInfo: playerInfoRes,
      //     amount: splitAmount,
      //     result: NUMERICAL.TWO,
      //     currencyType: tableConfigData.currencyType,
      //   };
      // }
      const grpcRes = {};

      await tableGameplayService.deleteSplitRequest(tableId);

      return {
        tableId,
        eliminatedUsers: eliminatedPlayers,
        userId: tableGamePlayData.splitUserId,
        username: splitUsername,
        playerInfo: playerInfoRes,
        amount: splitAmount,
        result: NUMERICAL.ONE,
        isSplitable,
        grpcRes,
        playersGamePlayData,
        tableGamePlayData,
      };
    }
    return {
      tableId,
      eliminatedUsers: eliminatedPlayers,
      userId: tableGamePlayData.splitUserId,
      username: splitUsername,
      playerInfo: playerInfoRes,
      amount: splitAmount,
      result: NUMERICAL.TWO,
    };
  }

  async handleSplitReject(userId: number, tableConfigData: any) {
    Logger.info(`handleSplitReject: userId: ${userId}`, [
      tableConfigData,
    ]);
    const { currentRound, _id: tableId } = tableConfigData;

    const splitData = await tableGameplayService.getSplitRequest(
      tableId,
    );

    if (!splitData) {
      return Logger.error(
        `INTERNAL_SERVER_ERROR handleSplitReject: no split in process, userId: ${userId}`,
        [tableConfigData],
      );
    }

    const tableGamePlayData: any =
      await tableGameplayService.getTableGameplay(
        tableId,
        currentRound,
        ['splitUserId', 'seats', 'splitCount', 'potValue'],
      );

    const { seats } = tableGamePlayData;

    const usersDataPromise = seats.map((seat: any) =>
      userProfileService.getUserDetailsById(seat._id),
    );
    const pgpDataPromise = seats.map((seat: any) =>
      playerGameplayService.getPlayerGameplay(
        seat._id,
        tableId,
        currentRound,
        ['userId', 'dealPoint', 'split', 'userStatus', 'points'],
      ),
    );

    const usersData: Array<UserProfile | null> = await Promise.all(
      usersDataPromise,
    );
    const playersGamePlayData: Array<PlayerGameplay | null> =
      await Promise.all(pgpDataPromise);
    const playersInfo: any = usersData.filter(Boolean);

    const splitUsername = playersInfo.find(
      (p: any) => p.id === tableGamePlayData.splitUserId,
    ).userName;

    const isSplitable = await this.isTableSplitable(
      playersGamePlayData,
      tableConfigData,
    );
    const eliminatedPlayers = isSplitable.eliminatedPlayers.map(
      (ele: any) => ele.userId,
    );

    if (!(isSplitable && isSplitable.splitType)) {
      Logger.error(
        `INTERNAL_SERVER_ERROR table is not splitable from handleSplitReject,
        userId: ${userId}`,
        [isSplitable, tableConfigData],
      );
      return null;
    }

    const playerGameData: any = playersGamePlayData.find(
      (player) => player?.userId === userId,
    );

    playerGameData.split = NUMERICAL.ZERO;
    tableGamePlayData.splitCount -= 1;

    const playerInfoRes: Array<any> = [];
    isSplitable.playingPlayers.forEach((player: any) => {
      const { split } = player;
      const splitStatus = this.getSplitStatus(split);

      playerInfoRes.push({
        userId: player.userId,
        username: playersInfo.find((p: any) => p.id === player.userId)
          .userName,
        splitStatus,
        totalPoints: player.dealPoint,
      });
    });

    const perPlayerAmount =
      tableGamePlayData.potValue / isSplitable.playingPlayers.length;
    const splitAmount = deductRake(
      perPlayerAmount,
      tableConfigData.rakePercentage,
    );

    await tableGameplayService.deleteSplitRequest(tableId);

    return {
      tableId,
      eliminatedUsers: eliminatedPlayers,
      userId: tableGamePlayData.splitUserId,
      username: splitUsername,
      playerInfo: playerInfoRes,
      amount: splitAmount,
      result: NUMERICAL.ZERO,
    };
  }

  async isTableSplitable(
    playersGameData: (any | null)[],
    tableData: any,
  ) {
    const { maximumPoints, rebuyUsed } = tableData;
    const {
      TABLE_MIN_SPLITABLE_POINTS_101,
      TABLE_MIN_SPLITABLE_POINTS_201,
      TABLE_MIN_SPLITABLE_POINTS_61,
    } = zk.getConfig();

    let splitMinPoints = TABLE_MIN_SPLITABLE_POINTS_101;
    if (maximumPoints === 201)
      splitMinPoints = TABLE_MIN_SPLITABLE_POINTS_201;
    else if (maximumPoints === 61)
      splitMinPoints = TABLE_MIN_SPLITABLE_POINTS_61;

    let responseObj: any = null;
    /**
     * checking for manual split
     */
    if (playersGameData.length > 2) {
      responseObj = {};
      let splitEligibilePlayers: Array<any> = [];

      for (let i = 0; i < playersGameData.length; ++i) {
        const player: any = playersGameData[i];
        if (
          player.dealPoint < maximumPoints &&
          player.dealPoint >= splitMinPoints
        ) {
          splitEligibilePlayers.push(player);
          if (rebuyUsed) responseObj.rejoinTable = true;
        } else if (player.dealPoint < splitMinPoints) {
          splitEligibilePlayers = [];
          break;
        }
      }

      const eliminatedPlayers = playersGameData.filter(
        (player: any) => player.dealPoint >= maximumPoints,
      );

      /**
       * TWO PLAYERS split
       */
      if (splitEligibilePlayers.length === 2) {
        responseObj.splitType = SPLIT.TWO_PLAYER_SPLIT;
      } else if (
        /**
         * THREE PLAYERS split
         */
        (playersGameData.length > 3 &&
          splitEligibilePlayers.length === 3) ||
        (playersGameData.length === 3 &&
          responseObj.rejoinTable &&
          splitEligibilePlayers.length === playersGameData.length)
      )
        responseObj.splitType = SPLIT.THREE_PLAYER_SPLIT;

      responseObj.playingPlayers = splitEligibilePlayers;
      responseObj.eliminatedPlayers = eliminatedPlayers;
    }
    Logger.info(
      `isSplitable table: ${tableData._id} >> responseObj: `,
      [responseObj],
    );
    return responseObj;
  }

  private getSplitStatus(split: number) {
    // let button = 1; // nothing
    // if (split === 1) button = 0; // accept
    // else if (split === 0) button = 2; // reject

    let splitStatus = SPLIT_STATUS.NOT_RESPONDED; // NOT_RESPONDED
    if (split === 1) splitStatus = SPLIT_STATUS.ACCEPTED; // ACCEPTED
    else if (split === 0) splitStatus = SPLIT_STATUS.REJECTED; // REJECTED
    return splitStatus;
  }
}

export const splitHandler = new SplitHandler();
