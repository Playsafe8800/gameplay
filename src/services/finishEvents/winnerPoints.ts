import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import _ from 'underscore';
import {
  LEAVE_TABLE_REASONS,
  NUMERICAL,
  PLAYER_STATE,
  PLAYER_STATUS,
  TABLE_STATE,
} from '../../constants';
import { EVENTS, STATE_EVENTS } from '../../constants/events';
import { playerGameplayService } from '../../db/playerGameplay';
import { pushIntoQueue } from '../../db/redisWrapper';
import { roundScoreBoardService } from '../../db/roundScoreBoard';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { turnHistoryService } from '../../db/turnHistory/index';
import { userProfileService } from '../../db/userProfile';
import {
  ScoreBoardPlayerInfoData,
  UserCashSchema,
} from '../../objectModels';
import { TurnDetailsSchema } from '../../objectModels/turnHistory';
import { socketOperation } from '../../socketHandler/socketOperation';
import { eventStateManager } from '../../state/events';
import {
  getIdPrefix,
  removePickCardFromCards,
  roundInt,
  sendAutoDebitInfo,
  setUserCash,
} from '../../utils';
import { dateUtils } from '../../utils/date';
import { CancelBattleError } from '../../utils/errors';
import { getPlayingUserInRound } from '../../utils/getPlayingUserInRound';
import { redlock } from '../../utils/lock/redlock';
import { sortedCards } from '../../utils/turnHistory';
import { cancelBattle } from '../gameplay/cancelBattle';
import { cardHandler } from '../gameplay/cardHandler';
import { round } from '../gameplay/round';
import { leaveDisconnectedUsers } from '../leaveTable/leaveDisconnectedUsers';
import { scheduler } from '../schedulerQueue/index';
import { winner } from './winner';
import * as console from 'node:console';

class WinnerPoints {
  async declareWinner(tableId: string) {
    try {
      Logger.info('declareWinner: ', tableId);

      const tableData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          ['currentRound', 'currencyFactor'],
        );

      const { currentRound, currencyFactor } = tableData;
      const [tableGameData]: Array<any> = await Promise.all([
        tableGameplayService.getTableGameplay(tableId, currentRound, [
          'totalPlayerPoints',
          'potValue',
          'declarePlayer',
          'seats',
          'tableState',
          'papluCard'
        ]),
        turnHistoryService.getTurnHistory(tableId, currentRound),
      ]);

      if (!tableData || !tableGameData) {
        throw new Error(
          `tableData or tableGameData not set in declareWinner`,
        );
      }
      if (tableGameData.tableState === TABLE_STATE.WINNER_DECLARED) {
        Logger.info('declareWinner: table already finished ', [
          tableId,
          tableData,
          tableGameData,
        ]);
        return;
      }

      const playersGameData = await Promise.all(
        tableGameData.seats.map((seat) =>
          playerGameplayService.getPlayerGameplay(
            seat._id,
            tableId,
            currentRound,
            ['userId', 'userStatus', 'points', 'winningCash', 'currentCards'],
          ),
        ),
      );
      Logger.info(`declareWinner: playersGameData ${tableId} `, [
        playersGameData,
      ]);

      const { declarePlayer } = tableGameData;
      let totalPlayer = 0;
      playersGameData.map(async (player: any) => {
        if (declarePlayer !== player.userId) {
          const playerData = player;

          if (playerData.userStatus === PLAYER_STATE.FINISH) {
            let { points } = playerData;
            let pointsAsPerCF = currencyFactor * points;
            pointsAsPerCF = roundInt(pointsAsPerCF, 2);

            if (points != 0 && points != 80){
              console.log(playerData.currentCards, "---playerData.cards---", tableGameData.papluCard)
              let pplu = tableGameData.papluCard.split("-")[0]+"-"+tableGameData.papluCard.split("-")[1]
              console.log(pplu, "--pplu--")
              for (let i = 0; i < playerData.currentCards.length; i++) {
                if (playerData.currentCards[i].includes(pplu)) {
                  points += 10;
                }
              }
            }

            playerData.points = points;
            playerData.winningCash = -pointsAsPerCF;
            tableGameData.potValue += pointsAsPerCF;
            tableGameData.totalPlayerPoints += points;
            await playerGameplayService.setPlayerGameplay(
              playerData.userId,
              tableId,
              currentRound,
              playerData,
            );
          }
        }

        totalPlayer += 1;

        if (playersGameData.length === totalPlayer) {
          await tableGameplayService.setTableGameplay(
            tableId,
            currentRound,
            tableGameData,
          );

          await this.handleWinnerPoints(
            tableId,
            currentRound,
            declarePlayer,
          );
        }
      });
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR Error from declareWinner: ${tableId}`, [error]);
      if (error instanceof CancelBattleError) {
        await cancelBattle.cancelBattle(tableId, error);
      }
      throw error;
    }
  }

  async handleWinnerPoints(
    tableId: string,
    currentRound: any,
    declarePlayer: any,
  ) {
    try {
      const [
        tableConfigData,
        tableGameData, // tableGamePlayData,
        winnerPgpData,
      ]: Array<any> = await Promise.all([
        tableConfigurationService.getTableConfiguration(tableId, [
          '_id',
          'lobbyId',
          'gameType',
          'currentRound',
          'rakePercentage',
          'isNewGameTableUI',
        ]),
        tableGameplayService.getTableGameplay(tableId, currentRound, [
          'tableState',
          'trumpCard',
          'opendDeck',
          'seats',
          'potValue',
          'closedDeck'
        ]),
        playerGameplayService.getPlayerGameplay(
          declarePlayer,
          tableId,
          currentRound,
          [
            'userId',
            'seatIndex',
            'groupingCards',
            'currentCards',
            'dealPoint',
          ],
        ),
      ]);

      Logger.info(
        `handleWinnerPoints for table ${tableId} - ${currentRound} `,
        [winnerPgpData?.dealPoint],
      );

      const { potValue } = tableGameData;
      const seats = tableGameData.seats.filter((e) => e._id !== null);

      try {
        await scheduler.cancelJob.botTurn(tableId, declarePlayer);
      } catch (error) {
        Logger.error(`botTurn cancel for ${tableId} ${declarePlayer}`);
      }
      // playerList
      const playersGameData = await Promise.all(
        seats.map((seat) =>
          playerGameplayService.getPlayerGameplay(
            seat._id,
            tableId,
            currentRound,
            [
              'userId',
              'userStatus',
              'groupingCards',
              'cardPoints',
              'meld',
              'dealPoint',
              'points',
            ],
          ),
        ),
      );

      await this.updateRoundEndHistoryPoints(
        playersGameData,
        currentRound,
        tableId,
        winnerPgpData.userId,
        tableGameData.trumpCard,
        tableGameData.closedDeck,
        tableGameData.opendDeck[tableGameData.opendDeck.length -1]
      );

      tableGameData.tableState = TABLE_STATE.WINNER_DECLARED;
      await tableGameplayService.setTableGameplay(
        tableId,
        currentRound,
        tableGameData,
      );

      const playersInfoDataArr = (
        await Promise.all(
          playersGameData.map(async (p: any) => {
            return userProfileService.getUserDetailsById(p.userId);
          }),
        )
      ).filter(Boolean);
      Logger.info(`Player profiles ${tableId}`, [playersInfoDataArr]);

      const userSessionIds: any = {};
      playersGameData.forEach(async (p: any) => {
        userSessionIds[p.userId] = tableId;
      });

      const grpcFinishBattleResponse =
        await winner.grpcCallForRoundFinish(
          tableConfigData,
          tableGameData,
          playersGameData,
          winnerPgpData,
          true, // isFinalBattle,
          playersGameData,
          playersInfoDataArr,
        );

      const pointsAsPerCF = roundInt(
        potValue - (potValue * tableConfigData.rakePercentage) / 100,
        2,
      );
      winnerPgpData.winningCash = pointsAsPerCF;
      await playerGameplayService.setPlayerGameplay(
        winnerPgpData.userId,
        tableId,
        currentRound,
        winnerPgpData,
      );

      playersGameData.forEach(async (player: any) => {
        // affect for finish/playing status only
        if (
          player.userStatus !== PLAYER_STATE.FINISH &&
          player.userStatus !== PLAYER_STATE.PLAYING
        )
          return;
        const profileData =
          await userProfileService.getUserDetailsById(player.userId);

        const grpcPlayerData =
          grpcFinishBattleResponse?.playersData.find(
            (p: any) => p.userId === player?.userId,
          );
        const userTableRummyWallet =
          grpcPlayerData?.cashWinnings?.amount;
        await setUserCash(
          tableId,
          userTableRummyWallet,
          'Game Win/Lost',
          profileData,
          !!tableConfigData.isNewGameTableUI,
        );
      });

      if (winnerPgpData?.currentCards?.length > 13) {
        const remainingCard = winnerPgpData.currentCards.pop();
        if (remainingCard) {
          tableGameData.opendDeck.push(remainingCard);
          winnerPgpData.groupingCards = removePickCardFromCards(
            remainingCard,
            winnerPgpData.groupingCards,
          );

          await playerGameplayService.setPlayerGameplay(
            winnerPgpData.userId,
            tableId,
            currentRound,
            winnerPgpData,
          );
        }
      }

      // calling again since we updated the winningCash of winner
      const updatedPlayerList = await Promise.all(
        seats.map((seat) =>
          playerGameplayService.getPlayerGameplay(
            seat._id,
            tableId,
            currentRound,
            [
              'userId',
              'meld',
              'groupingCards',
              'userStatus',
              'winLoseStatus',
              'points',
              'tenant',
              'seatIndex',
            ],
          ),
        ),
      );

      const playerPgpList = _.clone(updatedPlayerList);
      for (let i = 0; i < playerPgpList.length; i++) {
        for (let j = 0; j < playerPgpList.length - i - 1; j++) {
          if (playerPgpList[j].points > playerPgpList[j + 1].points) {
            const temp = _.clone(playerPgpList[j]);
            playerPgpList[j] = _.clone(playerPgpList[j + 1]);
            playerPgpList[j + 1] = _.clone(temp);
          }
        }
      }

      const scoreboardData: Array<any> = [];
      for (let k = 0; k < playerPgpList.length; k++) {
        playerPgpList[k].winLoseStatus =
          playerPgpList[k].seatIndex === winnerPgpData.seatIndex
            ? PLAYER_STATUS.WINNER
            : PLAYER_STATUS.LOOSER;
        scoreboardData.push(playerPgpList[k]);
      }

      const playersProfileData = await Promise.all(
        playersGameData.map((e: any) =>
          userProfileService.getUserDetailsById(e?.userId),
        ),
      );

      const winnerDeclarePlayerInfo: Array<any> = [];
      const scoreBoardPlayerInfo: Array<ScoreBoardPlayerInfoData> =
        [];
      for (let i = 0; i < scoreboardData.length; i++) {
        const playerData = scoreboardData[i];
        if (playerData) {
          const profileData = playersProfileData.find(
            (e: any) => e.id === playerData?.userId,
          );
          const meldLabel = cardHandler.labelTheMeld({
            meld: playerData?.meld,
            cardsGroup: playerData?.groupingCards,
          });
          const grpcPlayerData =
            grpcFinishBattleResponse?.playersData.find(
              (p: any) => p.userId === playerData?.userId,
            );
          // for new gameTableUI
          // when 2P available at last then change the staus playing to finish to show cards
          const userStatus =
            playerData?.userStatus === PLAYER_STATE.PLAYING
              ? PLAYER_STATE.FINISH
              : playerData?.userStatus;
          const winLoseStatus = playerData?.winLoseStatus; // for old one
          const totalPoints = playerData?.points;
          const userCashObj = (profileData?.userTablesCash &&
            profileData?.userTablesCash.find(
              (utc: UserCashSchema) => utc.tableId === tableId,
            )) || { userCash: 0 };
          winnerDeclarePlayerInfo.push({
            userId: playerData?.userId,
            status: winLoseStatus,
            userCash: userCashObj?.userCash,
          });
          scoreBoardPlayerInfo.push({
            userId: playerData?.userId,
            username: profileData?.userName || '',
            profilePicture: profileData?.avatarUrl || '',
            userCash: userCashObj?.userCash,
            status: winLoseStatus,
            userStatus,
            totalPoints: totalPoints,
            points: playerData?.points,
            meld: meldLabel,
            group: playerData?.groupingCards,
            isRebuyApplicable: grpcPlayerData?.isPlayAgain,
            canPlayAgain: grpcPlayerData?.isPlayAgain,
            rank: grpcPlayerData?.rank || 0,
            winAmount: grpcPlayerData?.cashWinnings?.amount || 0, // grpcPlayerData?.cashWinnings?.amount || 0,
            tenant: playerData.tenant,
          });
        }
      }

      const scoreBoardData = {
        tableId,
        potValue: pointsAsPerCF,
        tableState: tableGameData.tableState,
        wildCard: tableGameData.trumpCard,
        papluCard: tableGameData.papluCard,
        winnerUserId: winnerPgpData.userId,
        playerInfo: scoreBoardPlayerInfo,
      };

      await roundScoreBoardService.setRoundScoreBoard(
        tableId,
        currentRound,
        scoreBoardData,
      );

      const winnerDeclareData = {
        tableId,
        potValue,
        tableState: tableGameData.tableState,
        playerInfo: winnerDeclarePlayerInfo,
      };
      socketOperation.sendEventToRoom(
        tableId,
        EVENTS.WINNER_DECLARE,
        winnerDeclareData,
      );
      scheduler.addJob.scoreBoard(
        tableId,
        currentRound,
        updatedPlayerList,
        grpcFinishBattleResponse,
        tableConfigData?.isNewGameTableUI,
        true, // for points true
      );
      for (let i = 0; i < playersGameData.length; i++) {
        const playerData = playersGameData[i];
        if (!playerData) continue;
        const { userId } = playerData;
        // instrumentation call
        // userPlayedGame(
        //   scoreBoardPlayerInfo,
        //   userId,
        //   playersProfileData,
        //   tableConfigData,
        //   tableGameData,
        //   playerData,
        //   winnerPgpData.userId,
        // );
      }
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR Error on Handle Winner Points: ${tableId}`, [
        error,
      ]);
      if (error instanceof CancelBattleError) {
        await cancelBattle.cancelBattle(tableId, error);
      }
    }
  }

  async updateRoundEndHistoryPoints(
    scoreboardData: any[],
    currentRound: number,
    tableId: string,
    winnerId: number,
    trumpCard: string,
    closedDeck: Array<string>,
    openTopCard: string
  ) {
    try {
      let currentRoundHistory =
        await turnHistoryService.getTurnHistory(
          tableId,
          currentRound,
        );
      const userFinalStateTurnDetails: TurnDetailsSchema[] = [];
      let length = userFinalStateTurnDetails.length + 1;

      scoreboardData.forEach((user) => {
        const cardState = user.groupingCards.toString();
        const historyObj = {
          turnNo: length,
          userId: user.userId,
          turnStatus: String(user.userStatus).toUpperCase(),
          startState: cardState,
          cardPicked: '',
          cardPickSource: '',
          cardDiscarded: '',
          endState: cardState,
          createdOn: new Date().toISOString(),
          points: user.cardPoints,
          sortedStartState: sortedCards(
            user.groupingCards,
            user.meld || [],
          ),
          sortedEndState: sortedCards(
            user.groupingCards,
            user.meld || [],
          ),
          isBot: user.isBot,
          wildCard: trumpCard,
          closedDeck: closedDeck,
          openedDeckTop: openTopCard
        };
        userFinalStateTurnDetails.push(historyObj);

        length += 1;
      });
      if (!currentRoundHistory) {
        const [tableConfigData, tableGameData] = await Promise.all([
          tableConfigurationService.getTableConfiguration(tableId, [
            'currentRound',
          ]),
          tableGameplayService.getTableGameplay(
            tableId,
            currentRound,
            ['_id', 'trumpCard'],
          ),
        ]);
        if (!tableGameData)
          throw new Error(`Table gameplay not set for ${tableId}`);
        currentRoundHistory =
          turnHistoryService.getDefaultCurrentRoundTurnHistoryData(
            tableConfigData,
            tableGameData,
          );
        await turnHistoryService.setTurnHistory(
          tableId,
          currentRound,
          currentRoundHistory,
        );
      }
      currentRoundHistory.userFinalStateTurnDetails =
        userFinalStateTurnDetails;
      currentRoundHistory.winnerId = winnerId;

      Logger.debug(`updateRoundEndHistoryPoints: ${tableId}`, [
        'currentRoundHistory',
        currentRoundHistory,
      ]);

      await turnHistoryService.setTurnHistory(
        tableId,
        currentRound,
        currentRoundHistory,
      );
    } catch (error) {
      Logger.error(`INTERNAL_SERVER_ERROR err on updateRoundEndHistoryPoints ${tableId}`, [
        error,
      ]);
    }
  }

  async handleRoundFinishPoints(
    tableId: string,
    currentRound: number,
    finalDataGrpc: any,
  ) {
    if (
      Object.keys(finalDataGrpc).length === 0 ||
      !finalDataGrpc?.playersData ||
      finalDataGrpc?.playersData?.length === 0
    ) {
      Logger.error('INTERNAL_SERVER_ERRORCATCH_ERROR:', [
        'final grpc data not found in afterRoundFinish',
        tableId,
      ]);
      throw new Error(
        'final grpc data not found in afterRoundFinish',
      );
    }
    const tableConfigData =
      await tableConfigurationService.getTableConfiguration(tableId, [
        'currentRound',
      ]);
    const tableGameplayData =
      await tableGameplayService.getTableGameplay(
        tableId,
        currentRound,
        ['seats'],
      );
    if (!tableGameplayData) {
      throw new Error(
        `table not found in afterRoundFinis ${tableId}`,
      );
    }

    const playersPgp: Array<any> = await Promise.all(
      tableGameplayData.seats.map((seat) =>
        playerGameplayService.getPlayerGameplay(
          seat._id,
          tableId,
          tableConfigData.currentRound,
          ['userId', 'userStatus'],
        ),
      ),
    );
    const activePlayersPgp = getPlayingUserInRound(playersPgp);

    /**
     * if not found any users then remove the table
     */
    if (activePlayersPgp.length === 0) {
      Logger.info(
        `handleRoundFinish- ${tableId} -> activePlayersPgp not found`,
      );
      return true;
    }
    const grpcPlayersData = finalDataGrpc.playersData;
    activePlayersPgp.map((pgpData: any) => {
      grpcPlayersData.map((gpd: any) => {
        if (`${pgpData.userId}` === `${gpd.userId}`) {
          pgpData.isPlayAgain = gpd.isPlayAgain;
          pgpData.pointRummyAutoDebit = gpd.pointRummyAutoDebit;
          pgpData.pointRummyWallet = gpd.pointRummyWallet;
        }
        return gpd;
      });
      return pgpData;
    });

    // this.removeOnLowBalanceAndAutoDebit(
    //   tableId,
    //   currentRound,
    //   tableConfigData,
    //   tableGameplayData,
    //   activePlayersPgp,
    // );

    const remainPlayers = activePlayersPgp.filter(
      (player: any) => player.userStatus !== PLAYER_STATE.LEFT,
    );
    // scheduler.addJob.playMoreDelay(
    //   tableId,
    //   tableGameplayData,
    //   remainPlayers,
    //   finalDataGrpc,
    //   tableConfigData,
    // );

    return undefined;
  }

  async removeOnLowBalanceAndAutoDebit(
    tableId: string,
    currentRound: number,
    tableConfigData: any,
    tableGamePlayData: any,
    playersGameData: any,
  ) {
    const LeaveTableHandler = (
      await import('../../services/leaveTable')
    ).default;
    let totalPlayer = 0;
    await playersGameData.map(async (player: any) => {
      const profile: any =
        await userProfileService.getUserDetailsById(player.userId);

      Logger.info(
        `---removeOnLowBalanceAndAutoDebit--- tableId: ${tableId}, userId: ${player.userId} >> `,
        [
          ' -- canPlayAgain -- ',
          player.isPlayAgain,
          ' -- playerInfo.pointRummyAutoDebit -- ',
          player.pointRummyAutoDebit,
        ],
      );

      if (!player.isPlayAgain) {
        await LeaveTableHandler.main(
          {
            reason: LEAVE_TABLE_REASONS.NO_BALANCE,
            tableId,
          },
          player?.userId,
        );
      } else {
        const isAmountAutoDebited =
          player?.pointRummyAutoDebit?.isAutoDebitDone;
        if (isAmountAutoDebited) {
          // local - true / main - true / autoDebitDone - true // update rummy wallet for user exp.
          const autoDebitAmount =
            player?.pointRummyAutoDebit?.moneyDetail?.amount;

          if (autoDebitAmount) {
            sendAutoDebitInfo({
              socketId: profile?.socketId,
              tableId,
              userId: player?.userId,
              amount: Number(autoDebitAmount),
            });
          }
        }
      }
      totalPlayer += 1;
      if (playersGameData.length === totalPlayer) {
        // leave disconnected users and initialize new game
        await leaveDisconnectedUsers(tableId, currentRound);

        // set round timer
        await scheduler.addJob.pointsNextRoundTimerStart(
          tableId,
          tableConfigData.currentRound,
        );
      }
    });
  }

  async setupNextRoundPoints(tableId: string) {
    Logger.info(`setupNextRoundPoints: `, [tableId]);
    let lock!: Lock;
    try {
      lock = await redlock.Lock.acquire([`lock:${tableId}`], 5000);
      Logger.info(
        `Lock acquired, in setupNextRoundPoints points on resource:, ${lock.resource}`,
      );
      const tableInfo =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          [
            '_id',
            'gameType',
            'currentRound',
            'maximumSeat',
            'shuffleEnabled',
            'maximumPoints',
            'bootValue',
          ],
        );
      const { currentRound } = tableInfo;
      const tableGamePlayData =
        await tableGameplayService.getTableGameplay(
          tableId,
          currentRound,
          ['seats', 'standupUsers'],
        );
      if (!tableGamePlayData)
        throw new Error(
          `tableGamePlay data not present setupNextRoundPoints ${tableId}`,
        );

      const {
        tableGamePlayData: newTableGamePlayData,
        tableData: newTableConfigData,
      } = await round.createNewRoundPoints(
        tableInfo,
        tableGamePlayData,
      );
      Logger.info(
        `setupNextRoundPoints creating new round >> : ${tableId} `,
        [newTableGamePlayData, newTableConfigData],
      );

      if (!newTableGamePlayData || !newTableGamePlayData?.seats) {
        return Logger.info(
          `seats not found on setupNextRoundPoints ${tableId}:${currentRound}`,
          `newTableGamePlayData: `,
          newTableGamePlayData,
        );
      }

      // get seats without _id null
      const currentPlayersInTable = newTableGamePlayData.seats.filter(
        (seat: any) => seat._id,
      );

      const currentPlayersCount = currentPlayersInTable.length;
      if (currentPlayersCount >= newTableConfigData.minimumSeat) {
        Logger.info(
          `scheduled >>>> new Round: ${newTableConfigData.currentRound} 
          on table ${tableId}, currentPlayersCount: ${currentPlayersCount}`,
        );
        const roundTimerStartedData = {
          tableId,
          currentRound: newTableConfigData.currentRound || 1,
          timer: dateUtils.addEpochTimeInSeconds(
            newTableConfigData.gameStartTimer,
          ),
        };
        await scheduler.addJob.tableStart(
          tableId,
          (newTableConfigData.gameStartTimer - NUMERICAL.FIVE) *
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
        newTableGamePlayData.tableState =
          TABLE_STATE.ROUND_TIMER_STARTED;
        const currentTime = new Date();
        newTableGamePlayData.tableCurrentTimer = new Date(
          currentTime.setSeconds(
            currentTime.getSeconds() +
              Number(newTableConfigData.gameStartTimer),
          ),
        ).toISOString();
      }
      newTableGamePlayData.noOfPlayers = currentPlayersCount;
      await tableGameplayService.setTableGameplay(
        tableId,
        newTableConfigData.currentRound,
        newTableGamePlayData,
      );

      if (currentPlayersCount < newTableConfigData.maximumSeat) {
        const key = `${getIdPrefix(newTableConfigData.gameType)}:${
          newTableConfigData.lobbyId
        }`;
        await pushIntoQueue(key, tableId);
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR _CATCH_ERROR_: setupNextRoundPoints, tableId( ${tableId}) found error:-`,
        [error],
      );
    } finally {
      try {
        if (lock && lock instanceof Lock) {
          await redlock.Lock.release(lock);
          Logger.info(
            `Lock releasing, in setupNextRoundPoints; resource:, ${lock.resource}`,
          );
        }
      } catch (err: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock on setupNextRoundPoints: ${err}`, err
        );
      }
    }
  }
}

export const winnerPoints = new WinnerPoints();
