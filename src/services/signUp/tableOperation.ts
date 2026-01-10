import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import _ from 'underscore';
import {
  EVENTS,
  NUMERICAL,
  REDIS_CONSTANTS,
  RUMMY_TYPES,
  TABLE_STATE,
} from '../../constants';
import { STATE_EVENTS, USER_EVENTS } from '../../constants/events';
import { playerGameplayService } from '../../db/playerGameplay';
import { popFromQueue, pushIntoQueue } from '../../db/redisWrapper';
import { removeValueFromSet } from '../../db/redisWrapper/index';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { userProfileService } from '../../db/userProfile';
import {
  PlayerJoined,
  TableStartData,
  UserCashSchema,
  UserProfile,
} from '../../objectModels';
import { networkParams } from '../../objectModels/playerGameplay';
import { socketOperation } from '../../socketHandler/socketOperation';
import { eventStateManager } from '../../state/events';
import {
  getIdPrefix,
  getRandomTableId,
  isPointsRummyFormat,
} from '../../utils';
import { dateUtils } from '../../utils/date';
import { redlock } from '../../utils/lock/redlock';
import defaultData from '../defaultData';
import { initializeGame } from '../gameplay/initialiseGame';
import { scheduler } from '../schedulerQueue';
import gameTableInfo from './gameTableInfo';
import { cancelBattle } from '../gameplay/cancelBattle';
import { seatShuffle } from '../gameplay/seatShuffle';
import { RemoteConfig } from '../../constants/remoteConfig';
import * as console from 'node:console';

class TableOperation {
  async addInTable(
    socket: any,
    tableConfigurationData: any,
    userData: UserProfile,
    retries: number = NUMERICAL.ONE,
    networkParams?: networkParams,
    tableSessionId?: string,
    fromSQS = false,
  ) {
    let isNewTable = false
    if (retries > NUMERICAL.THREE) {
      throw new Error(
        `could not find table even after ${retries} retries`,
      );
    }
    let lock!: Lock;
    let tableGameData;
    let tableId!: string;
    try {
      const userId = userData.id;
      // const { userName, avatarUrl, isPrime } = userData;
      const { lobbyId, maximumSeat, bootValue, gameType } =
        tableConfigurationData;
      const key = `${getIdPrefix(gameType)}:${lobbyId}`;
      let roundNum: number = NUMERICAL.ONE;

      const { mmAlgo } = tableConfigurationData;
      let ifTableExist = true;

      if (!fromSQS) {
        tableId = await this.getAvailableTable(
          key,
          userData,
          maximumSeat,
          gameType,
        );
        if (!tableId) {
          ifTableExist = false;
          tableId = await this.createTable(tableConfigurationData);
          await this.setupRound(
            tableId,
            roundNum,
            tableConfigurationData,
            null,
          );
          isNewTable = true
        } else {
          tableConfigurationData =
            await tableConfigurationService.getTableConfiguration(
              tableId,
              [
                '_id',
                'currentRound',
                'maximumSeat',
                'maximumPoints',
                'gameType',
                'dealsCount',
                'currencyType',
                'lobbyId',
                'minimumSeat',
                'gameStartTimer',
                'bootValue',
              ],
            );
        }
      }

      Logger.info(
        `addInTable found or created tableId: ${tableId} for user: ${userId}`,
        [tableConfigurationData],
      );

      lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
      Logger.info(
        `Lock acquired, in addInTable resource:, ${lock.resource}`,
      );

      // update round number here to get latest pgp data for points
      if (isPointsRummyFormat(gameType))
        roundNum = tableConfigurationData.currentRound;
      Logger.info(
        `Attempting to get table gameplay data for tableId: ${tableId}, round: ${roundNum}`,
      );
      tableGameData = await tableGameplayService.getTableGameplay(
        tableId,
        roundNum,
        ['tableState', 'noOfPlayers'],
      );
      Logger.info(`Retrieved table gameplay data:`, [tableGameData]);

      if (!tableGameData) {
        throw new Error(
          `Table game data is not set up while add table operation`,
        );
      }
      if (tableGameData.noOfPlayers === maximumSeat) {
        return await this.addInTable(
          socket,
          tableConfigurationData,
          userData,
          retries + 1,
          networkParams,
          tableSessionId,
        );
      }
      if (
        !(
          tableGameData.tableState ===
          TABLE_STATE.ROUND_TIMER_STARTED ||
          tableGameData.tableState === TABLE_STATE.WAITING_FOR_PLAYERS
        )
      ) {
        Logger.info(
          `Found table at retry ${retries} but already locked`,
          [tableId],
        );
        try {
          if (lock && lock instanceof Lock) {
            await redlock.Lock.release(lock);
            Logger.info(
              `Lock releasing, in addInTable; resource:, ${lock.resource}`,
            );
          }
        } catch (err: any) {
          Logger.error(
            `INTERNAL_SERVER_ERROR Error While releasing lock on addInTable: ${err}`,
            [err],
          );
        }
        return await this.addInTable(
          socket,
          tableConfigurationData,
          userData,
          retries + 1,
          networkParams,
          tableSessionId,
        );
      }

      const gtiData = await this.insertNewPlayer(
        socket,
        userData,
        tableConfigurationData,
        true,
        networkParams,
        tableSessionId,
      );
      gtiData.isNewTable = isNewTable
      return gtiData;
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR Error occurred in addInTable ${error}`, [error]);
    } finally {
      try {
        if (lock && lock instanceof Lock) {
          await redlock.Lock.release(lock);
          Logger.info(
            `Lock releasing, in addInTable; resource:, ${lock.resource}`,
          );
        }
      } catch (err: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock on addInTable: ${err}`, [err]
        );
      }
    }
  }

  private async checkBeforeStartRound(
    userId: number,
    tableConfigurationData: any,
    updatedTableGameplayData: any,
  ) {
    const {
      _id: tableId,
      currentRound,
      gameType,
      lobbyId,
    } = tableConfigurationData;
    const { noOfPlayers } = updatedTableGameplayData;
    if (noOfPlayers === tableConfigurationData.minimumSeat) {
      Logger.info(
        `schedule has been started min player joined in ${tableId}, ${noOfPlayers}`,
      );
      const roundTimerStartedData = {
        tableId,
        currentRound: tableConfigurationData.currentRound || 1,
        timer: dateUtils.addEpochTimeInSeconds(
          tableConfigurationData.gameStartTimer,
        ),
      };
      await scheduler.addJob.tableStart(
        tableId,
        (tableConfigurationData.gameStartTimer - NUMERICAL.FIVE) *
        NUMERICAL.THOUSAND,
      );
      // change state
      await Promise.all([
        eventStateManager.fireEvent(
          tableId,
          STATE_EVENTS.START_ROUND_TIMER,
        ),
        socketOperation.sendEventToRoom(
          tableId,
          EVENTS.ROUND_TIMER_STARTED,
          roundTimerStartedData,
        ),
      ]);
      updatedTableGameplayData.tableState =
        TABLE_STATE.ROUND_TIMER_STARTED;
      const currentTime = new Date();
      updatedTableGameplayData.tableCurrentTimer = new Date(
        currentTime.setSeconds(
          currentTime.getSeconds() +
          Number(tableConfigurationData.gameStartTimer),
        ),
      ).toISOString();
      updatedTableGameplayData.potValue = 0;
      if (!isPointsRummyFormat(gameType)) {
        updatedTableGameplayData.potValue =
          tableConfigurationData.bootValue * noOfPlayers;
      }
    }

    await tableGameplayService.setTableGameplay(
      tableId,
      currentRound,
      updatedTableGameplayData,
    );

    const key = `${getIdPrefix(gameType)}:${lobbyId}`;
    if (noOfPlayers < tableConfigurationData.maximumSeat) {
      await pushIntoQueue(key, tableId);
    }
    return updatedTableGameplayData;
  }

  async createTable(tableConfigData) {
    // create new table
    const tableId = getRandomTableId();
    tableConfigData =
      typeof tableConfigData == 'string'
        ? JSON.parse(tableConfigData)
        : tableConfigData;
    tableConfigData._id = tableId;
    tableConfigData.currentRound = NUMERICAL.ONE;
    await tableConfigurationService.setTableConfiguration(
      tableId,
      tableConfigData,
      true,
    );
    return tableId;
  }

  async getAvailableTable(
    key: string,
    userData: UserProfile,
    maximumSeat: number,
    gameType: string,
  ) {
    let tableId!: string;
    const defaultTableGame = {
      seats: [],
    };
    let tableGameData: any = defaultTableGame;
    let seats = tableGameData.seats.filter((ele) => ele._id);
    while (
      (tableGameData &&
        tableGameData.tableState !==
        TABLE_STATE.WAITING_FOR_PLAYERS &&
        tableGameData.tableState !==
        TABLE_STATE.ROUND_TIMER_STARTED) ||
      seats.length === maximumSeat
    ) {
      tableId = '';
      tableGameData = null;
      tableId = await popFromQueue(key);
      Logger.info('tableId fetched from available table ', [tableId, seats, tableGameData && tableGameData.tableState])
      if (userData.tableIds.indexOf(tableId) != -1) {
        const tbId: string = await popFromQueue(key);
        await pushIntoQueue(key, tableId);
        tableId = tbId;
      }
      if (tableId) {
        const tableConfigData =
          await tableConfigurationService.getTableConfiguration(
            tableId,
            ['currentRound'],
          );

        // if tableConfig not found then find a new table
        if (!tableConfigData) {
          tableId = '';
        } else {
          tableGameData = await tableGameplayService.getTableGameplay(
            tableId,
            isPointsRummyFormat(gameType)
              ? tableConfigData.currentRound
              : NUMERICAL.ONE,
            ['seats', "tableState"]
          );

          if (tableGameData.seats.length !== maximumSeat) {
            tableGameData = tableGameData || defaultTableGame;
            seats = tableGameData.seats.filter((ele) => ele._id);
          } else {
            tableId = ''
            tableGameData = defaultTableGame
          }
          Logger.info('tableId fetched from available table seats ', [seats, tableId, tableGameData && tableGameData.tableState])
        }
      }
    }

    return tableId;
  }

  async setupRound(
    tableId: string,
    roundNumber: number,
    tableConfigurationData: any,
    oldTableGamePlayData: any,
  ) {
    const tableGamePlayData = defaultData.getTableGameplayData(
      oldTableGamePlayData,
    );

    // state creation
    // for pool and deals stated will be created on first round
    if (
      isPointsRummyFormat(tableConfigurationData.gameType) ||
      roundNumber === NUMERICAL.ONE
    )
      await eventStateManager.createState(tableId);

    return Promise.all([
      // create Game Table
      this.insertTableGamePlay(
        tableGamePlayData,
        tableId,
        roundNumber,
      ),
      // update currentRound in tableConfig
      this.updateTableConfigRoundNumber(
        tableConfigurationData,
        roundNumber,
      ),
    ]);
  }

  async insertNewPlayer(
    socket: any,
    userData: UserProfile,
    tableConfigurationData: any,
    startRoundTimer: boolean,
    networkParams?: networkParams,
    tableSessionId?: string,
  ): Promise<any> {
    const {
      id: userId,
      userName,
      avatarUrl,
      isPrime,
      tenant,
    } = userData;
    const { _id: tableId } = tableConfigurationData;
    const { playerGameplayData, updatedTableGameplayData } =
      await this.insertPlayerInTable(
        userData,
        tableConfigurationData,
        undefined,
        networkParams,
        tableSessionId,
      );
    const filteredSeats = updatedTableGameplayData.seats.filter(
      (seat) => seat._id,
    );

    const promiseList = filteredSeats.map((seat) =>
      userProfileService.getOrCreateUserDetailsById(seat._id),
    );

    const promiseListPGP = filteredSeats.map((seat) =>
      playerGameplayService.getPlayerGameplay(
        seat._id,
        tableId,
        tableConfigurationData.currentRound,
        [
          'userId',
          'userStatus',
          'points',
          'seatIndex',
          'dealPoint',
          'isAutoDrop',
          'isFirstTurn',
        ],
      ),
    );
    Logger.info(`filteredSeats are on table ${tableId}`, [
      filteredSeats,
      `Users list is ${tableId}: `,
      promiseList,
    ]);

    const usersData: Array<UserProfile> = await Promise.all(
      promiseList,
    );
    const playerGameplayDataUsers: Array<any | null> =
      await Promise.all(promiseListPGP);
    Logger.info(`Table ${tableId} usersData is`, [
      usersData,
      `playerGameplayDataUsers: `,
      playerGameplayDataUsers,
    ]);

    const playerInfoPromise = filteredSeats.map((seat) =>
      userProfileService.getOrCreateUserDetailsById(seat._id),
    );

    const userCashObj = (userData?.userTablesCash &&
      userData.userTablesCash.find(
        (utc: UserCashSchema) => utc.tableId === tableId,
      )) || { userCash: 0 };
    const playerJoinedData: PlayerJoined = {
      tableId,
      availablePlayers: filteredSeats.length,
      seatIndex: playerGameplayData.seatIndex,
      userId,
      username: userName,
      profilePicture: avatarUrl,
      prime: isPrime,
      tableState: updatedTableGameplayData.tableState,
      totalPoints: playerGameplayData.dealPoint,
      tenant,
      userCash: userCashObj.userCash,
    };
    await socketOperation.sendEventToRoom(
      tableId,
      EVENTS.PLAYER_JOINED,
      playerJoinedData,
    );

    const totalPlayers = await Promise.all(playerInfoPromise);
    // const totalPlayersCount = totalPlayers.length;
    updatedTableGameplayData.noOfPlayers = totalPlayers.length;

    // RUM-5607
    // this.sendInstrumentation(
    //   tableConfigurationData,
    //   updatedTableGameplayData,
    //   userId,
    //   totalPlayers,
    //   socket,
    // );

    if (!userData.isBot)
      this.addPlayerInTable(socket, {
        tableId,
        usersData,
        maximumSeat: tableConfigurationData?.maximumSeat,
      });

    const updatedTgp = await this.checkBeforeStartRound(
      userId,
      tableConfigurationData,
      updatedTableGameplayData,
    );

    const gtiData = gameTableInfo.formatGameTableInfo(
      tableConfigurationData,
      updatedTgp,
      usersData,
      playerGameplayDataUsers,
      playerGameplayData,
    );
    Logger.info(`gtiData: `, [gtiData]);

    return gtiData;
  }

  async insertPlayerInTable(
    userData: UserProfile,
    tableConfigData: any,
    oldPlayerGameplayData?: any,
    networkParams?: networkParams,
    tableSessionId?: string,
  ) {
    const { id: userId } = userData;
    const {
      _id: tableId,
      currentRound,
      maximumPoints,
    } = tableConfigData;
    Logger.info(
      `insertPlayerInTable user: ${userId}, table: ${tableId}:${currentRound}`,
    );
    const tableGameplayData =
      await tableGameplayService.getTableGameplay(
        tableId,
        currentRound,
        ['seats', 'tableState', 'noOfPlayers'],
      );
    if (!tableGameplayData) {
      throw new Error(
        `tableGameplayData not found in insertPlayerInTable for ${tableId}`,
      );
    }
    const seatIndex = this.insertPlayerInSeat(
      tableGameplayData.seats,
      userId,
      userData.isBot
    );
    let dealPoint = oldPlayerGameplayData?.dealPoint || 0;
    if (
      tableConfigData.gameType === RUMMY_TYPES.DEALS &&
      !dealPoint
    ) {
      dealPoint = 160;
    }
    const playerGameplayData =
      playerGameplayService.getDefaultPlayerGameplayData(
        userId,
        seatIndex || 0,
        dealPoint,
        false,
        networkParams,
        tableSessionId,
      );

    if (
      oldPlayerGameplayData &&
      oldPlayerGameplayData?.dealPoint >= maximumPoints
    ) {
      playerGameplayData.userStatus =
        oldPlayerGameplayData && oldPlayerGameplayData.userStatus
          ? oldPlayerGameplayData.userStatus
          : playerGameplayData.userStatus;
    }
    if (!userData.tableIds.includes(tableId)) {
      // remove this for multi table
      userData.tableIds = []
      userData.userTablesCash = []
      userData.tableIds.push(tableId);
      userData.userTablesCash.push({
        tableId,
        userCash: tableConfigData.bootValue,
      });
    }
    // addPlayerInTable;

    await Promise.all([
      playerGameplayService.setPlayerGameplay(
        userId,
        tableId,
        currentRound,
        playerGameplayData,
      ),
      tableGameplayService.setTableGameplay(
        tableId,
        currentRound,
        tableGameplayData,
      ),
      userProfileService.setUserDetails(userId, userData),
    ]);

    // user state creation
    if (
      isPointsRummyFormat(tableConfigData.gameType) ||
      currentRound === NUMERICAL.ONE
    ) {
      await eventStateManager.createUserState(tableId, userId);
    } else {
      await eventStateManager.fireEventUser(
        tableId,
        userId,
        USER_EVENTS.PLAYING,
        networkParams?.timeStamp || dateUtils.getCurrentEpochTime(),
      );
    }
    return {
      playerGameplayData,
      updatedTableGameplayData: tableGameplayData,
    };
  }

  insertPlayerInSeat(seats: any[], userObjectId: number, isBot: boolean) {
    let seatIndex!: number;
    let seatObject: any = {};

    for (let i = 0; i < seats.length; ++i) {
      const seat = seats[i];

      // found an empty place in array
      if (!seat) break;

      // found a left seat
      if (!seat._id) {
        seatIndex = i;
        seatObject = seat;
      } else if (seat._id === userObjectId) {
        return i;
      }
    }

    if (seatIndex === undefined) {
      seatIndex = seats.length;
      seats.push({
        _id: userObjectId,
        seat: seatIndex,
        isBot
      });
    } else {
      seatObject._id = userObjectId;
      seatObject.seat = seatIndex;
      seatObject.isBot = isBot;
    }
    // check if same seatIndex found here in seat
    let dublicateSeat = false;
    let isZeroAvailable = true;
    for (let i = 0; i < seats.length; i++) {
      const element = seats[i];
      if (element.seat === 0) isZeroAvailable = false;
      if (element.seat === seatIndex && userObjectId !== element._id)
        dublicateSeat = true;
    }
    if (dublicateSeat) {
      seatIndex = isZeroAvailable ? 0 : seats.length;
      for (let i = 0; i < seats.length; i++) {
        if (seats[i]['_id'] === userObjectId)
          seats[i]['seat'] = seatIndex;
      }
    }
    return seatIndex;
  }

  async updateTableConfigRoundNumber(
    tableConfigurationData: any,
    currentRound: number,
  ) {
    await tableConfigurationService.updateCurrentRound(
      tableConfigurationData._id,
      currentRound,
    );
  }

  async insertTableGamePlay(
    tableGameplayData,
    tableId: string,
    roundNumber: number,
  ) {
    await tableGameplayService.setTableGameplay(
      tableId,
      roundNumber,
      tableGameplayData,
    );
  }

  async addPlayerInTable(
    socket: any,
    data: { usersData: any; tableId: string; maximumSeat: number },
  ) {
    const { tableId } = data;
    if (socket)
      await socketOperation.addClientInRoom(socket, tableId);
  }

  async initializeGameplayForFirstRound(data: TableStartData) {
    Logger.info('initializeGameplayForFirstRound');
    const { tableId } = data;
    let lock!: Lock;
    try {
      lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
      Logger.info(
        `Lock acquired, in initializeGameplayForFirstRound resource:, ${lock.resource}`,
      );
      const tableConfigData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          [
            "_id",
            'currentRound',
            'minimumSeat',
            'lobbyId',
            'maximumSeat',
            'gameType',
            'bootValue',
            'currencyType',
            'isMultiBotEnabled'
          ],
        );
      const { currentRound } = tableConfigData;
      let tableGameplayData =
        await tableGameplayService.getTableGameplay(
          tableId,
          currentRound,
          ['seats'],
        );

      if (!tableGameplayData || !tableConfigData) {
        throw new Error(`Table data is not set correctly ${tableId}`);
      }
      tableGameplayData.tableState = TABLE_STATE.LOCK_IN_PERIOD;
      await tableGameplayService.setTableGameplay(
        tableId,
        currentRound,
        tableGameplayData,
      );

      let currentPlayersInTable = tableGameplayData.seats.filter(
        (seat: any) => seat._id,
      ).sort((a: any, b: any) => a.seat - b.seat);
      if (
        currentPlayersInTable &&
        currentPlayersInTable.length >= tableConfigData.minimumSeat
      ) {
        let playingUsersWithUserId = await Promise.all(
          currentPlayersInTable
            .map(async (e) => {
              const userObject =
                await userProfileService.getUserDetailsById(e._id);
              const playerGamePlay =
                await playerGameplayService.getPlayerGameplay(
                  e._id,
                  tableId,
                  currentRound,
                  ['tableSessionId'],
                );

              e.userId = userObject?.id;
              e.sessionId = playerGamePlay?.tableSessionId;
              const userDetail = {
                playingUser: { ...e, isBot: userObject?.isBot },
                userLobbyDetail: {
                  userId: e.userId || 0,
                  lobbyId: tableConfigData.lobbyId,
                  appType: userObject?.headers?.apptype,
                  sessionId: playerGamePlay?.tableSessionId || '',
                  appVersion: userObject?.headers?.versionname,
                },
              };
              return userDetail;
            })
            .filter((detail) => detail !== null),
        );

        const botIndexs: any = []
        if (tableConfigData.isMultiBotEnabled) {
          for (let i = 0; i < playingUsersWithUserId.length; i++) {
            const firstEle = playingUsersWithUserId[i]['playingUser'];
            if (firstEle.isBot) botIndexs.push({ _id: firstEle._id, seat: firstEle.seat })
          }
          if (botIndexs.length === currentPlayersInTable.length) {
            await initializeGame.removeInsuficientFundUser(currentPlayersInTable.map((e) => e._id), tableConfigData, null)
            return;
          }
        }

        playingUsersWithUserId = playingUsersWithUserId.filter(
          (e) => e,
        );
        const key = `${REDIS_CONSTANTS.QUEUE}:${getIdPrefix(
          tableConfigData.gameType,
        )}:${tableConfigData.lobbyId}`;
        await removeValueFromSet(key, tableId);

        const grpcRes = await initializeGame.createBattle(
          tableId,
          playingUsersWithUserId,
          tableConfigData,
        );
        if (!grpcRes) throw new Error(`Couldn't setup first round`);
        //@ts-ignore deals
        currentPlayersInTable = grpcRes.tableGameData.seats;
        tableGameplayData =
          await tableGameplayService.getTableGameplay(
            tableId,
            currentRound,
            ['seats'],
          );

        if (!tableGameplayData) {
          throw new Error(
            `Table data is not set correctly ${tableId}`,
          );
        }
        Logger.info(
          `Players playing after lockin period ${tableId} `,
          [tableGameplayData.seats],
        );
        await Promise.all([
          tableGameplayService.setTableGameplay(
            tableId,
            currentRound,
            tableGameplayData,
          ),
          eventStateManager.fireEvent(
            tableId,
            STATE_EVENTS.SNAPSHOT_TIMER,
          ),
        ]);

        Logger.info('calling round start timer');
        scheduler.addJob.roundStart(
          tableId,
          NUMERICAL.TWO * NUMERICAL.THOUSAND,
        );

        /**
         * send collect boot socket room event to client
         */
        if (!isPointsRummyFormat(tableConfigData.gameType)) {
          const userIds = _.compact(
            _.pluck(currentPlayersInTable, '_id'),
          );

          socketOperation.sendEventToRoom(
            tableId,
            EVENTS.COLLECT_BOOT_VALUE_SOCKET_EVENT,
            {
              tableId,
              userIds,
              bootValue: tableConfigData.bootValue,
              totalBootValue:
                tableConfigData.bootValue * userIds.length,
              currencyType: tableConfigData.currencyType,
            },
          );
        }
      } else {
        Logger.error(`INTERNAL_SERVER_ERROR player not found ${tableId}`);
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error in initializeGameplayForFirstRound ${error.message}`,
        [error],
      );
      await cancelBattle.cancelBattle(data.tableId, error);
    } finally {
      try {
        if (lock && lock instanceof Lock) {
          await redlock.Lock.release(lock);
          Logger.info(
            `Lock releasing, in initializeGameplayForFirstRound; resource:, ${lock.resource}`,
          );
        }
      } catch (err: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock on initializeGameplayForFirstRound: ${err}`,[err]
        );
      }
    }
  }
}

export const tableOperation = new TableOperation();
