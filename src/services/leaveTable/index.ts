import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import {
  BOT_CONFIG,
  EVENTS,
  GAME_END_REASONS,
  LEAVE_TABLE_REASONS,
  NUMERICAL,
  PLAYER_STATE,
  POINTS,
  REDIS_CONSTANTS,
  RUMMY_TYPES,
  TABLE_STATE,
  TURN_HISTORY,
} from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import {
  pushIntoQueue,
  removeValueFromSet,
} from '../../db/redisWrapper';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { turnHistoryService } from '../../db/turnHistory';
import { userProfileService } from '../../db/userProfile';
import {
  LeaveTableInput,
  LeaveTableOnRoundStartedPointsInput,
  LeaveTableResult,
  SeatSchema,
  StandupUserSchema,
  UpdateTurnDetailsSchema,
  UserProfile,
} from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import {
  deductScoreForDeals,
  formatGameDetails,
  getDropPoints,
  getIdPrefix,
  isPointsRummyFormat,
  removePickCardFromCards,
  roundInt,
} from '../../utils';
import { redlock } from '../../utils/lock/redlock';
import { validateThrowCardRoomRes } from '../../validators/response.validator';
import { winner } from '../finishEvents/winner';
import { changeTurn } from '../gameplay/turn';
import { scheduler } from '../schedulerQueue';

import _ from 'underscore';
import { USER_EVENTS } from '../../constants/events';
import { networkParams } from '../../objectModels/playerGameplay';
import { eventStateManager } from '../../state/events';
import { dateUtils } from '../../utils/date';
import { winnerPoints } from '../finishEvents/winnerPoints';
import userServiceExt from '../../userService';
import { GAME_END_REASONS_INSTRUMENTATION } from '../../constants/gameEndReasons';
import { UpdateTurnDetails } from '../../utils/turnHistory';
import { shuffleOpenDeck } from '../gameplay/ShuffleOpenDeck';

class LeaveTableHandler {
  async main(
    data: LeaveTableInput,
    userId: number,
    networkParams?: networkParams,
  ): Promise<LeaveTableResult> {
    const { tableId, reason } = data;
    let lock!: Lock;
    try {
      if (!tableId) {
        throw new Error('Table Id is required in leaveTablehandler');
      }

      let isDropNSwitch = true;

      if (!data?.isDropNSwitch) {
        isDropNSwitch = false;
        lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
        Logger.info(
          `Lock acquired, in leaveTable resource:, ${lock?.resource}`,
        );
      }

      const tableConfigurationData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          [
            '_id',
            'currentRound',
            'gameType',
            'maximumSeat',
            'minimumSeat',
            'lobbyId',
            'maximumPoints',
            'currencyFactor',
            'gameStartTimer',
            'gameType',
            'currencyFactor',
            'isMultiBotEnabled'
          ],
        );
      const {
        currentRound,
        gameType,
        maximumSeat: maxPlayers,
      } = tableConfigurationData;

      const [
        tableGameplayData,
        playerGamePlayData,
        userInfo,
        currentRoundHistory,
      ] = await Promise.all([
        tableGameplayService.getTableGameplay(tableId, currentRound, [
          'tableState',
          'seats',
          'noOfPlayers',
          'tableState',
          'currentTurn',
          'opendDeck',
          'pointsForRoundWinner',
          'potValue',
          'standupUsers',
          'declarePlayer',
        ]),
        playerGameplayService.getPlayerGameplay(
          userId,
          tableId,
          currentRound,
          [
            'userId',
            'isFirstTurn',
            'seatIndex',
            'tableSessionId',
            'userStatus',
            'dealPoint',
            'points',
            'winningCash',
            'currentCards',
            'groupingCards',
          ],
        ),
        userProfileService.getOrCreateUserDetailsById(userId),
        turnHistoryService.getTurnHistory(tableId, currentRound),
      ]);
      Logger.info(
        `leaving table  ${tableId} : ${userId} at ${tableGameplayData?.tableState}, reason: ${reason}`,
        [
          tableConfigurationData,
          tableGameplayData,
          playerGamePlayData,
        ],
      );

      if (!tableGameplayData || !playerGamePlayData)
        throw new Error(
          `TableGamePlay or PlayerGamePlay not found, ${tableId}`,
        );

      if (!userInfo) throw new Error('UserProfile not found');
      if (userInfo.isBot) {
        Logger.info(
          `updating userProfile in backend-service ${userId} ${tableId}`,
        );
      }
      await userServiceExt.updateProfile(userId, {
        isPlaying: false,
        currentMatchId: null,
        currentLobbyId: 0
      });
      const leaveTableResponse = {
        userId,
        tableId,
        exit: true,
        availablePlayers: tableGameplayData?.noOfPlayers,
        round: currentRound,
        potValue: 0,
        isSwitch: !!(reason === LEAVE_TABLE_REASONS.SWITCH),
        insufficentFund: !!(
          reason === LEAVE_TABLE_REASONS.NO_BALANCE
        ),
        inGameSwitch: false, // for points switch button
        tableState: tableGameplayData.tableState,
      };

      if (
        !tableGameplayData.seats.find((obj) => obj._id === userId) ||
        playerGamePlayData?.userStatus === PLAYER_STATE.LEFT
      ) {
        Logger.info(
          `User is not playing in this table ${tableId} ${userId}`,
        );
        await socketOperation.sendEventToClient(
          userInfo.socketId,
          {
            ...leaveTableResponse,
            potValue: tableGameplayData?.potValue,
          },
          EVENTS.LEAVE_TABLE,
        )
        return {userId, tableId, exit: true}
      }
      const seatsClone: Array<any> = JSON.parse(
        JSON.stringify(tableGameplayData.seats),
      );


      const safeStates: Array<string> = [
        TABLE_STATE.WAITING_FOR_PLAYERS,
        TABLE_STATE.ROUND_TIMER_STARTED,
      ];
      const canNotLeaveStates: Array<string> = [
        TABLE_STATE.LOCK_IN_PERIOD,
        TABLE_STATE.DECLARED,
      ];

      const { currentTurn, tableState, seats } = tableGameplayData;
      // if user already leave then can't leave again(pgp will be null)
      if (
        canNotLeaveStates.includes(tableState) ||
        !playerGamePlayData
      ) {
        throw new Error(
          `Couldn't leave the table state ${tableState} ${tableId}`,
        );
      }

      const { tableIds } = userInfo;
      if (reason == LEAVE_TABLE_REASONS.ELIMINATED) {
        await this.updateUserLeftPGP(userId, tableId, currentRound);
      }
      if (
        (reason === LEAVE_TABLE_REASONS.ELIMINATED ||
          reason === LEAVE_TABLE_REASONS.GRPC_FAILED) &&
        !safeStates.includes(tableState)
      ) {
        // TODO: need to verify it's required or not
        // Lib.Scheduler.cancelJob.cancelRoundStartTimer(tableId);
        // Lib.Scheduler.cancelJob.cancelTableSnapshot(tableId);

        await this.updateTGPandPGPandUserProfile(
          userId,
          tableId,
          tableConfigurationData,
          tableGameplayData,
          userInfo,
          false,
          reason,
          { playerGamePlay: playerGamePlayData },
        );
      }

      if (
        gameType === RUMMY_TYPES.DEALS &&
        maxPlayers > 2 &&
        !safeStates.includes(tableState)
      ) {
        // flow for Deals 6P

        userInfo.tableIds = tableIds.filter(
          (t_id) => t_id !== tableId,
        );

        await userProfileService.setUserDetails(userId, userInfo);

        // socketOperation.sendEventToClient(
        //   userInfo.socketId,
        //   {
        //     ...leaveTableResponse,
        //     availablePlayers: tableGameplayData?.noOfPlayers - 1,
        //     potValue: tableGameplayData?.potValue[userInfo.id],
        //   },
        //   EVENTS.LEAVE_TABLE,
        // );

        // return { tableId, userId, exit: true };
      }

      let isDeckShuffled = false;

      // remove userId from standupUsers if standup user left
      if (isPointsRummyFormat(gameType)) {
        this.removeFromStandupUsers(
          tableGameplayData,
          userId,
          tableId,
          currentRound,
        );
      }

      // first round, game did not start
      if (
        (isPointsRummyFormat(gameType) ||
          currentRound === NUMERICAL.ONE) &&
        (safeStates.includes(tableState) ||
          reason === LEAVE_TABLE_REASONS.GRPC_FAILED)
      ) {
        await this.updateTGPandPGPandUserProfile(
          userId,
          tableId,
          tableConfigurationData,
          tableGameplayData,
          userInfo,
          true,
          reason,
        );
        if (isPointsRummyFormat(gameType)) {
          await this.managePlayerOnLeave(
            tableConfigurationData,
            tableGameplayData,
            isDeckShuffled,
            { userId },
          );
        }
      } else if (tableState === TABLE_STATE.ROUND_STARTED) {
        if (tableGameplayData?.closedDeck?.length === 0) {
          await shuffleOpenDeck({
            tableGamePlayData: tableGameplayData,
            tableId,
            currentRound,
          });

          isDeckShuffled = true;
        }
        const optionalObj: any = {};
        // current turn is user's turn
        if (currentTurn === userId) {
          scheduler.cancelJob.playerTurnTimer(tableId, userId);

          // picked one card;
          if (
            playerGamePlayData &&
            playerGamePlayData?.currentCards.length >
            NUMERICAL.THIRTEEN
          ) {
            const remainingCard =
              playerGamePlayData.currentCards.pop();
            if (remainingCard && playerGamePlayData.groupingCards) {
              const groupCards = removePickCardFromCards(
                remainingCard,
                playerGamePlayData.groupingCards,
              );
              playerGamePlayData.groupingCards = groupCards;

              const tableResponse = {
                tableId,
                userId,
                card: remainingCard,
              };
              validateThrowCardRoomRes(tableResponse);
              // throw card
              socketOperation.sendEventToRoom(
                tableId,
                EVENTS.DISCARD_CARD_SOCKET_EVENT,
                tableResponse,
              );
            }
            optionalObj.remainingCard = remainingCard;
          }
        }

        let lostPoints = 0;
        if (isPointsRummyFormat(gameType)) {
          // user can not leave below playerStates
          const canNotLeavePlayerStates: Array<string> = [
            PLAYER_STATE.DROP,
            PLAYER_STATE.LOST,
            PLAYER_STATE.WATCHING,
            PLAYER_STATE.LEFT,
          ];
          if (
            playerGamePlayData &&
            !canNotLeavePlayerStates.includes(
              playerGamePlayData.userStatus,
            )
          ) {
            const leaveTableOnRoundStartedPoints: LeaveTableOnRoundStartedPointsInput =
            {
              reason,
              userInfo,
              tableConfigurationData,
              tableGameplayData,
              playerGamePlay: playerGamePlayData,
              currentRoundHistory,
              isDropNSwitch,
            };
            ({ lostPoints } =
              await this.leaveTableOnRoundStartedPoints(
                leaveTableOnRoundStartedPoints,
              ));
          }
          optionalObj.canNotLeavePlayerStates =
            canNotLeavePlayerStates;
        }
        optionalObj.playerGamePlay = playerGamePlayData;
        optionalObj.lostPoints = lostPoints;
        await this.updateTGPandPGPandUserProfile(
          userId,
          tableId,
          tableConfigurationData,
          tableGameplayData,
          userInfo,
          false,
          reason,
          optionalObj,
        );

        const remainingPlayers = await this.remainingPlayers(
          tableId,
          currentRound,
          seats,
        );
        leaveTableResponse.availablePlayers = remainingPlayers.length;

        if (remainingPlayers?.length === NUMERICAL.ONE) {
          scheduler.cancelJob.playerTurnTimer(
            tableId,
            tableGameplayData.currentTurn,
          );
          scheduler.cancelJob.initialTurnSetup(
            tableId,
            tableGameplayData.currentTurn,
          );
          if (isPointsRummyFormat(gameType)) {
            await winnerPoints.handleWinnerPoints(
              tableId,
              currentRound,
              remainingPlayers[0]?.userId,
            );
          } else {
            await winner.handleWinner(
              { userId },
              tableConfigurationData,
              tableGameplayData,
            );
          }
        } else {
          await this.managePlayerOnLeave(
            tableConfigurationData,
            tableGameplayData,
            isDeckShuffled,
            { userId },
          );
        }

        const currentTurnData: UpdateTurnDetailsSchema = {
          points: NUMERICAL.EIGHTY,
          turnStatus: TURN_HISTORY.LEFT,
        };

        await UpdateTurnDetails(
          tableId,
          currentRound,
          currentTurnData,
        );
      } else if (
        isPointsRummyFormat(gameType) &&
        tableState === TABLE_STATE.WINNER_DECLARED
      ) {
        await this.updateTGPandPGPandUserProfile(
          userId,
          tableId,
          tableConfigurationData,
          tableGameplayData,
          userInfo,
          false,
          reason,
          { playerGamePlay: playerGamePlayData },
        );
      }

      const updatedTableGamePlayData =
        await tableGameplayService.getTableGameplay(
          tableId,
          currentRound,
          ['potValue', 'noOfPlayers'],
        );
      if (!updatedTableGamePlayData) {
        throw new Error(
          `Table gameplay not available ${tableId} ${currentRound}`,
        );
      }

      leaveTableResponse.tableState = tableGameplayData.tableState;
      leaveTableResponse.availablePlayers =
        updatedTableGamePlayData.noOfPlayers;
      let userIds = _.compact(_.pluck(seatsClone, '_id'));
      // while switch table don't send leave table to that user for points
      if (reason === LEAVE_TABLE_REASONS.SWITCH)
        userIds = userIds.filter((id) => id !== userId);

      const playersProfileData = await Promise.all(
        userIds.map((userId: number) =>
          userProfileService.getUserDetailsById(userId),
        ),
      );

      const userSocktMap: {
        [x: number]: string;
      } = {};
      playersProfileData.forEach((playerProfileData) => {
        if (
          playerProfileData
          // &&!(
          //   reason === LEAVE_TABLE_REASONS.ELIMINATED &&
          //   playerProfileData?.id === userId
          // )
        ) {
          if (playerProfileData) {
            userSocktMap[playerProfileData.id] =
              playerProfileData.socketId;
          }
        }
      });

      // for points switch button
      if (
        isPointsRummyFormat(gameType) &&
        !safeStates.includes(tableState)
      ) {
        leaveTableResponse.inGameSwitch = true;
      }
      if (reason === LEAVE_TABLE_REASONS.NO_BALANCE){
        leaveTableResponse.exit = false
      }

      const promiseLeaveTable: Promise<void>[] = [];
      Object.keys(userSocktMap).map((userId) => {
        promiseLeaveTable.push(
          socketOperation.sendEventToClient(
            userSocktMap[userId],
            {
              ...leaveTableResponse,
              potValue: updatedTableGamePlayData?.potValue,
            },
            EVENTS.LEAVE_TABLE,
          ),
        );
      });
      await Promise.all(promiseLeaveTable);
      if (!isPointsRummyFormat(gameType)) {
        const remainingPlayers = await this.remainingPlayers(
          tableId,
          currentRound,
          tableGameplayData.seats,
        );
        if (remainingPlayers?.length === NUMERICAL.ZERO) {
          const key = `${REDIS_CONSTANTS.QUEUE}:${getIdPrefix(
            gameType,
          )}:${tableConfigurationData.lobbyId}`;
          await removeValueFromSet(key, tableId);
          Logger.info(
            `remove table from queue >> tableId: ${tableId}`,
          );
        }
      }

      await Promise.all([
        eventStateManager.fireEventUser(
          tableId,
          userId,
          USER_EVENTS.LEFT,
          networkParams?.timeStamp || dateUtils.getCurrentEpochTime(),
        ),
      ]);
      socketOperation.removeClientFromRoom(
        tableId,
        userInfo.socketId,
      );
      return { tableId, userId, exit: true };
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR LeaveTableHandler.main table ${tableId} user ${userId}, ${error.message}`,
        [error],
      );
      throw error;
    } finally {
      try {
        if (lock && lock instanceof Lock) {
          await redlock.Lock.release(lock);
          Logger.info(
            `Lock releasing, in leaveTable; resource:, ${lock.resource}`,
          );
        }
      } catch (err: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock on leaveTable: ${err}`,
        );
      }
    }
  }

  async managePlayerOnLeave(
    tableConfigurationData: any,
    tableGameplayData: any,
    isDeckShuffled: boolean,
    playerGameData: any | { userId: number },
  ): Promise<boolean> {
    try {
      const {
        _id: tableId,
        currentRound,
        gameType,
        lobbyId,
      } = tableConfigurationData;
      const { noOfPlayers, tableState, currentTurn } =
        tableGameplayData;
      const { userId } = playerGameData;
      Logger.info(
        `managePlayerOnLeave: ${tableId}, noOfPlayers: ${noOfPlayers}`,
        [tableGameplayData],
      );

      const remainingPlayers = await this.remainingPlayers(
        tableId,
        currentRound,
        tableGameplayData.seats,
      );
      Logger.info(
        `managePlayerOnLeave: ${tableId}, remainingPlayers:`,
        [remainingPlayers],
      );

      if (
        isPointsRummyFormat(gameType) &&
        remainingPlayers?.length === NUMERICAL.ZERO
      ) {
        // cancel both the starting timer
        scheduler.cancelJob.tableStart(tableId);
        scheduler.cancelJob.roundStart(tableId);

        if (
          isPointsRummyFormat(gameType) &&
          tableGameplayData?.standupUsers?.length === 0
        ) {
          const key = `${REDIS_CONSTANTS.QUEUE}:${getIdPrefix(
            gameType,
          )}:${lobbyId}`;
          await removeValueFromSet(key, tableId);
          Logger.info(
            `In managePlayerOnLeave >> remove table from queue >> tableId: ${tableId}`,
          );
        }
      } else if (
        isPointsRummyFormat(gameType) &&
        remainingPlayers?.length === NUMERICAL.ONE &&
        tableState === TABLE_STATE.ROUND_STARTED
      ) {
        await winnerPoints.handleWinnerPoints(
          tableId,
          currentRound,
          remainingPlayers[0]?.userId,
        );
      } else if (
        // noOfPlayers === NUMERICAL.ONE &&
        !isPointsRummyFormat(gameType) &&
        remainingPlayers?.length === NUMERICAL.ONE &&
        (tableState === TABLE_STATE.ROUND_STARTED ||
          tableState === TABLE_STATE.DECLARED ||
          (tableState === TABLE_STATE.ROUND_TIMER_STARTED &&
            currentRound > 1))
      ) {
        winner.handleWinner(
          playerGameData,
          tableConfigurationData,
          tableGameplayData,
        );
      } else if (
        tableState === TABLE_STATE.ROUND_STARTED &&
        currentTurn === userId
      ) {
        await changeTurn(tableId);
      }
      return true;
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR LeaveTableHandler.managePlayerOnLeave ${error.message} `,
        [error],
      );
      throw error;
    }
  }

  private async remainingPlayers(
    tableId: string,
    currentRound: number,
    seats: SeatSchema[],
  ): Promise<any[]> {
    try {
      const remainingPlayersPgp: any[] = [];
      (
        await Promise.all(
          seats.map((e) => {
            return playerGameplayService.getPlayerGameplay(
              e._id,
              tableId,
              currentRound,
              ['userId', 'userStatus'],
            );
          }),
        )
      ).forEach((player) => {
        if (player?.userStatus === PLAYER_STATE.PLAYING) {
          remainingPlayersPgp.push(player);
        }
      });
      return remainingPlayersPgp;
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR LeaveTableHandler.remainingPlayers ${error.message} `,
        [error],
      );
      throw error;
    }
  }

  async updateUserLeftPGP(
    userId: number,
    tableId: string,
    roundNumber: number,
  ) {
    const playerGamePlayData =
      await playerGameplayService.getPlayerGameplay(
        userId,
        tableId,
        roundNumber,
        ['userId', 'userStatus'],
      );

    if (!playerGamePlayData)
      throw Error(
        `Player Game Play data not found for userId: ${userId} and tableId: ${tableId}`,
      );

    playerGamePlayData.userStatus = PLAYER_STATE.LEFT;

    await playerGameplayService.setPlayerGameplay(
      userId,
      tableId,
      roundNumber,
      playerGamePlayData,
    );
  }

  private async updateTGPandPGPandUserProfile(
    userId: number,
    tableId: string,
    tableConfigurationData: any,
    tableGameplayData: any,
    userInfo: UserProfile,
    gameDidNotStart: boolean,
    reason: string,
    optionalObj?: {
      playerGamePlay?: any | null;
      remainingCard?: string;
      lostPoints?: number;
      canNotLeavePlayerStates?: any; // for points
    },
  ) {
    try {
      const {
        currentRound,
        minimumSeat,
        lobbyId,
        maximumPoints,
        currencyFactor,
        gameType,
        isMultiBotEnabled
      } = tableConfigurationData;
      const { tableIds } = userInfo;

      if (tableGameplayData.noOfPlayers)
        tableGameplayData.noOfPlayers -= 1;

      Logger.info(
        `Updating no of players ${JSON.stringify(tableGameplayData)}`,
      );
      // leave before start game
      if (gameDidNotStart) {
        Logger.info(
          `TGP seats >> ${tableId}, ${tableGameplayData?.seats?.length}`,
          [tableGameplayData?.seats, `minimum seats ${minimumSeat}`],
        );

        if (tableGameplayData.seats.length <= minimumSeat) {
          tableGameplayData.tableState =
            TABLE_STATE.WAITING_FOR_PLAYERS;
          await scheduler.cancelJob.tableStart(tableId);
          const remainingSeats = tableGameplayData.seats.filter(
            (seat) => seat._id !== userId,
          );
          const remainingUser = remainingSeats[0]?._id; // only one user will be present

          if (remainingSeats.length <= NUMERICAL.ONE && !isMultiBotEnabled) {
            await scheduler.cancelJob.bot(tableId, currentRound);
            if (remainingSeats.length) {
              const userDetail =
                await userProfileService.getUserDetailsById(
                  remainingSeats[0]['_id'],
                );
              if (userDetail && userDetail.isBot && userDetail.id) {
                this.main(
                  {
                    tableId,
                    reason: LEAVE_TABLE_REASONS.ELIMINATED,
                  },
                  userDetail.id,
                );
              } else if (!userDetail?.isBot) {
                await scheduler.addJob.bot(
                  tableId,
                  currentRound,
                  BOT_CONFIG.BOT_WAITING_TIME_IN_MS
                );
              }
            }
          }
          if (remainingUser) {
            const lobbyConfig =
              await tableConfigurationService.getLobbyDetailsForMM(
                lobbyId,
              );
            if (lobbyConfig) {
              tableConfigurationData.gameStartTimer =
                lobbyConfig.gameStartTimer;
              await tableConfigurationService.setTableConfiguration(
                tableId,
                tableConfigurationData,
              );
            }
          }
          tableGameplayData.seats = remainingSeats.filter(
            (e) => e._id,
          );
        }

        // currentRound condition not required for points rummy
        if (isPointsRummyFormat(tableConfigurationData.gameType)) {
          let seatedPlayerCount = 0;
          tableGameplayData.seats.forEach((e: any) => {
            if (e._id === userId) {
              e._id = null;
            } else if (e._id) seatedPlayerCount += 1;
          });

          tableGameplayData.noOfPlayers = seatedPlayerCount;
          if (seatedPlayerCount < minimumSeat) {
            // change table state
            tableGameplayData.tableState =
              TABLE_STATE.WAITING_FOR_PLAYERS;
            // cancel round start timmer
            await scheduler.cancelJob.tableStart(tableId);
          }
        } else {
          tableGameplayData.seats.forEach((e) => {
            if (e._id === userId && currentRound === 1) {
              e._id = null as any;
            }
          });
        }

        const key = `${getIdPrefix(
          tableConfigurationData.gameType,
        )}:${lobbyId}`;
        await pushIntoQueue(key, tableId);
        playerGameplayService.deletePlayerGamePlay(
          userId,
          tableId,
          currentRound,
        );
      } else {
        // leave in game
        const playerGamePlayData =
          optionalObj?.playerGamePlay || ({} as any);

        if (optionalObj?.remainingCard) {
          tableGameplayData.opendDeck.push(optionalObj.remainingCard);
        }

        if (tableConfigurationData.gameType === RUMMY_TYPES.DEALS) {
          const cardPoints = POINTS.MANUAL_LEAVE_PENALTY_POINTS;

          deductScoreForDeals(
            playerGamePlayData,
            tableGameplayData,
            cardPoints,
          );
        } else if (
          isPointsRummyFormat(tableConfigurationData.gameType) &&
          tableGameplayData.tableState ===
          TABLE_STATE.ROUND_STARTED &&
          !optionalObj?.canNotLeavePlayerStates.includes(
            playerGamePlayData?.userStatus,
          )
        ) {
          const totalPoints =
            optionalObj?.lostPoints || POINTS.MAX_DEADWOOD_POINTS;

          Object.keys(tableGameplayData.potValue).forEach(
            (userId) => {
              const pointsAsPerCF = roundInt(
                currencyFactor * totalPoints,
                2,
              );
              // in case of points
              if (!tableGameplayData.potValue) {
                tableGameplayData.potValue = 0;
              }
              tableGameplayData.potValue += pointsAsPerCF;
            },
          );
          const pointsAsPerCF = roundInt(
            currencyFactor * totalPoints,
            2,
          );
          tableGameplayData.totalPlayerPoints += totalPoints;
          playerGamePlayData.points = totalPoints;
          playerGamePlayData.winningCash = -pointsAsPerCF;
        } else if (
          tableConfigurationData.gameType === RUMMY_TYPES.POOL
        ) {
          tableGameplayData.totalPlayerPoints += maximumPoints;
          playerGamePlayData.points = maximumPoints;
          playerGamePlayData.dealPoint = maximumPoints;
        }

        playerGamePlayData.userStatus = PLAYER_STATE.LEFT;
        playerGamePlayData.gameEndReason =
          GAME_END_REASONS_INSTRUMENTATION.EXIT;
        await playerGameplayService.setPlayerGameplay(
          userId,
          tableId,
          currentRound,
          playerGamePlayData,
        );
      }

      userInfo.tableIds = tableIds.filter((t_id) => t_id !== tableId);
      if (
        isPointsRummyFormat(tableConfigurationData.gameType) &&
        reason !== LEAVE_TABLE_REASONS.SWITCH
      ) {
        userInfo.userTablesCash = userInfo.userTablesCash.filter(
          (userTableCash) => userTableCash.tableId !== tableId,
        );
      }
      await Promise.all([
        userProfileService.setUserDetails(userId, userInfo),
        tableGameplayService.setTableGameplay(
          tableId,
          currentRound,
          tableGameplayData,
        ),
      ]);
      return tableGameplayData;
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR LeaveTableHandler.updateRedis ${error.message} `,
        [error],
      );
      throw error;
    }
  }

  // [POINTS] remove userId from standupUsers if standup user left
  private async removeFromStandupUsers(
    tableGameplayData: any,
    userId: number,
    tableId: string,
    currentRound: number,
  ) {
    const filteredStandupUsers =
      tableGameplayData?.standupUsers?.filter(
        (item: StandupUserSchema) => `${item._id}` !== `${userId}`,
      );
    if (
      filteredStandupUsers?.length !==
      tableGameplayData?.standupUsers?.length
    ) {
      tableGameplayData.standupUsers = filteredStandupUsers;
      await tableGameplayService.setTableGameplay(
        tableId,
        currentRound,
        tableGameplayData,
      );
    }
  }

  private async leaveTableOnRoundStartedPoints(
    userCashPointsData: LeaveTableOnRoundStartedPointsInput,
  ): Promise<{ lostPoints: number; error: boolean }> {
    const {
      reason,
      userInfo,
      tableConfigurationData,
      tableGameplayData,
      playerGamePlay,
      currentRoundHistory,
      isDropNSwitch,
    } = userCashPointsData;
    const {
      _id: tableId,
      currentRound,
      currencyFactor,
    } = tableConfigurationData;
    Logger.info(
      `---leaveTableOnRoundStartedPoints--ROUND_STARTED--- ${tableId}`,
    );
    let lostPoints = 0;
    if (
      playerGamePlay &&
      playerGamePlay.userStatus !== PLAYER_STATE.DROP &&
      playerGamePlay.userStatus !== PLAYER_STATE.LOST &&
      playerGamePlay.userStatus !== PLAYER_STATE.WATCHING &&
      playerGamePlay.userStatus !== PLAYER_STATE.LEFT
    ) {
      const { userId } = playerGamePlay;
      lostPoints = isDropNSwitch
        ? getDropPoints(
          playerGamePlay.isFirstTurn,
          tableConfigurationData.maximumPoints,
          tableConfigurationData.gameType,
          tableConfigurationData.maximumSeat,
        )
        : POINTS.MAX_DEADWOOD_POINTS;
      const pointsAsPerCF = roundInt(currencyFactor * lostPoints, 2);

      if (reason !== LEAVE_TABLE_REASONS.GRPC_FAILED) {
        const gameDetails = formatGameDetails(
          currentRound,
          tableGameplayData,
          currentRoundHistory,
        );
        const lostUserData = {
          si: playerGamePlay.seatIndex,
          userId: userInfo.id,
          sessionId: playerGamePlay.tableSessionId, // userInfo.unitySessionId,
          score: -lostPoints,
          gameEndReason:
            reason === GAME_END_REASONS.SWITCH
              ? GAME_END_REASONS.SWITCH
              : GAME_END_REASONS.LEFT,
          decimalScore: roundInt(-lostPoints, 2),
          roundEndReason: GAME_END_REASONS_INSTRUMENTATION.EXIT,
          gameType: tableConfigurationData.gameType,
          lobbyId: tableConfigurationData.lobbyId[userInfo.id],
          tableId,
          gameDetails,
          currentRound,
          startingUsersCount: tableGameplayData.noOfPlayers,
        };
        Logger.info(
          `UserData for leaveTable request on table: ${tableId}`,
          [lostUserData],
        );
      }
    }
    return { lostPoints, error: false };
  }
}

export = new LeaveTableHandler();
