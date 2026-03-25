import { Logger } from '../../newLogger';
import { zk } from '../../connections';
import {
  GAME_END_REASONS,
  LEAVE_TABLE_REASONS,
  NUMERICAL,
  PLAYER_STATE,
  PLAYER_STATUS,
  POOL_TYPES,
  RUMMY_TYPES,
  TABLE_STATE,
} from '../../constants';
import { EVENTS, STATE_EVENTS } from '../../constants/events';
import { playerGameplayService } from '../../db/playerGameplay';
import { roundScoreBoardService } from '../../db/roundScoreBoard';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { userProfileService } from '../../db/userProfile';
import {
  PlayerGameplay,
  ScoreBoardPlayerInfoData,
  TableConfigWinner,
  UserProfile,
} from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import { dateUtils } from '../../utils/date';
import { cardHandler } from '../gameplay/cardHandler';
import { round } from '../gameplay/round';
import { seatShuffle } from '../gameplay/seatShuffle';
import { scheduler } from '../schedulerQueue/index';

import { CURRENCY_TYPE } from '../../constants/tableState';
import { turnHistoryService } from '../../db/turnHistory/index';
import { TurnDetailsSchema } from '../../objectModels/turnHistory';
import { eventStateManager } from '../../state/events';
import {
  getIdPrefix,
  isGameTie,
  isPointsRummyFormat,
  removeEmptyString,
  rankSortComparator,
  getWinnings,
} from '../../utils';
import { sortedCards } from '../../utils/turnHistory';
import { mutantService } from '../mutant';
import { splitHandler } from '../split/index';
import { winnerPoints } from './winnerPoints';
import userServiceExt from '../../userService';
import { awsHelper, GameHistoryData } from '../aws';
import { redlock } from '../../utils/lock/redlock';
import { Lock } from 'redlock';
import { kickEliminatedUsers } from '../leaveTable/kickEliminatedUsers';

class Winner {
  // _id,currentRound
  async handleWinner(
    playerGameplayData: any,
    tableData: any,
    tableGameplayData: any,
  ) {
    Logger.info('handleWinner: ', [
      tableData._id,
      tableData,
      playerGameplayData,
    ]);
    const { _id: tableId, currentRound } = tableData;
    const { userId } = playerGameplayData;

    // setDropped player as declared player
    const tableGamePlayData = tableGameplayData;
    tableGamePlayData.declarePlayer = userId;
    await tableGameplayService.setTableGameplay(
      tableId,
      currentRound,
      tableGamePlayData,
    );
    try {
      await scheduler.cancelJob.botTurn(tableId, userId);
    } catch (error) {
      Logger.error(`botTurn cancel for ${tableId} ${userId}`);
    }

    await this.handleRoundWinner(tableId);

    Logger.info(' ------- start next round ', [
      tableId,
      playerGameplayData,
      tableData,
      tableGameplayData,
    ]);
  }

  clamp(num: number, min: number, max: number) {
    return num <= min ? min : num >= max ? max : num;
  }

  async handleRoundWinner(tableId: string) {
    Logger.info('handleRoundWinner: ', [tableId]);

    const tableData =
      (await tableConfigurationService.getTableConfiguration(
        tableId,
        [
          '_id',
          'currentRound',
          'rebuyUsed',
          'maximumPoints',
          'currencyType',
          'gameType',
          'dealsCount',
          'bootValue',
          'isNewGameTableUI',
          'lobbyId',
        ],
      )) as TableConfigWinner;

    const { currentRound } = tableData;
    const tableGameData = await tableGameplayService.getTableGameplay(
      tableId,
      currentRound,
      [
        'tableState',
        'trumpCard',
        'seats',
        'rebuyableUsers',
        'opendDeck',
        'pointsForRoundWinner',
        'potValue',
        'closedDeck',
      ],
    );

    if (!tableData || !tableGameData) {
      throw new Error(
        `tableData or tableGameData not set in handleRoundWinner`,
      );
    }
    if (
      tableGameData.tableState === TABLE_STATE.PLAY_MORE ||
      tableGameData.tableState === TABLE_STATE.WINNER_DECLARED
    ) {
      Logger.info('handleRoundWinner: table already finished ', [
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
          [
            'userId',
            'dealPoint',
            'userStatus',
            'points',
            'rank',
            'winLoseStatus',
            'tenant',
            'groupingCards',
            'totalPoints',
            'username',
            'userObjectId',
            'meld',
          ],
        ),
      ),
    );

    const { potValue, seats } = tableGameData;
    const { minimumPoints, minPointPlayerGameData } =
      this.calcMinCardsPoints(playersGameData);

    const prevPlayersGameData = await Promise.all(
      playersGameData.map(async (playerGame) => {
        const lastRoundNum = currentRound - 1;
        if (lastRoundNum > 0 && playerGame) {
          const prevPlayerGameData =
            await playerGameplayService.getPlayerGameplay(
              playerGame.userId,
              tableId,
              lastRoundNum,
              ['userId', 'dealPoint'],
            );

          if (!prevPlayerGameData)
            return {
              dealPoint: tableData.maximumPoints,
              useRebuy: false,
              userId: playerGame.userId,
            };
          return prevPlayerGameData;
        }
        return {
          dealPoint: 0,
          useRebuy: false,
          userId: playerGame?.userId,
        };
      }),
    );

    if (tableData.gameType === RUMMY_TYPES.DEALS) {
      Logger.info('---minPointPlayerGameData.dealPoint--', [
        minPointPlayerGameData.dealPoint,
        tableGameData.pointsForRoundWinner,
        ' --minPointPlayerGameData--',
        minPointPlayerGameData.userId,
        tableId,
      ]);
      minPointPlayerGameData.dealPoint +=
        tableGameData.pointsForRoundWinner;
    }

    if (minPointPlayerGameData?.currentCards?.length > 13) {
      const remainingCard = minPointPlayerGameData.currentCards.pop();
      if (remainingCard) {
        tableGameData.opendDeck.push(remainingCard);
      }
    }

    await playerGameplayService.setPlayerGameplay(
      minPointPlayerGameData.userId,
      tableId,
      tableData.currentRound,
      minPointPlayerGameData,
    );

    const playingPlayers = playersGameData.filter((p) => {
      if (p) {
        if (tableData.gameType === RUMMY_TYPES.DEALS) {
          return p.userStatus !== PLAYER_STATE.LEFT;
        } else {
          return (
            p.dealPoint < tableData.maximumPoints &&
            p.userStatus !== PLAYER_STATE.LEFT
          );
        }
      }
    });

    const presentPlayers = playersGameData.filter(
      (p: any) => p.userStatus !== PLAYER_STATE.LEFT,
    );
    // TODO: redundant assignment
    const players = presentPlayers;

    const scoreboardData: Array<any> = [];
    const seatCount = seats.length;

    //@ts-ignore
    playersGameData.sort(rankSortComparator);

    for (let k = 0; k < seatCount; ++k) {
      const playerGamePlayData = playersGameData[k];
      if (!playerGamePlayData) continue;
      playerGamePlayData.userStatus =
        playerGamePlayData.userStatus.toLowerCase();
      const prevPlayerGamePlayData =
        prevPlayersGameData.find((prevPlayerGameData) => {
          const prevUserId = prevPlayerGameData.userId;
          return prevUserId === playerGamePlayData.userId;
        }) || ({} as any);
      if (tableData.gameType === RUMMY_TYPES.DEALS) {
        playerGamePlayData.winLoseStatus =
          k === 0 ? PLAYER_STATUS.WINNER : PLAYER_STATUS.LOOSER;
      } else {
        playerGamePlayData.winLoseStatus =
          (playerGamePlayData.points === 0 ||
            playerGamePlayData.points === minimumPoints) &&
          playerGamePlayData.dealPoint < tableData.maximumPoints
            ? PLAYER_STATUS.WINNER
            : PLAYER_STATUS.LOOSER;
      }

      if (k === 0) {
        playerGamePlayData.rank = k + 1;
      } else if (
        playersGameData &&
        playersGameData[k - 1] &&
        playerGamePlayData.dealPoint ===
          playersGameData[k - 1]?.dealPoint
      ) {
        playerGamePlayData.rank = playersGameData[k - 1]?.rank || -1;
      } else {
        //@ts-ignore-start
        const r = parseInt(`${playersGameData[k - 1].rank}`, 10) + 1;
        playerGamePlayData.rank = r;
      }

      if (tableData.gameType === RUMMY_TYPES.DEALS) {
        playerGamePlayData.rank =
          playerGamePlayData.winLoseStatus === PLAYER_STATUS.WINNER
            ? 1
            : 2;
        scoreboardData.push(playerGamePlayData);
      } else {
        if (
          prevPlayerGamePlayData.dealPoint <
            tableData.maximumPoints ||
          playerGamePlayData.useRebuy
        )
          scoreboardData.push(playerGamePlayData);
      }
    }

    const isSplitable = await splitHandler.isTableSplitable(
      playersGameData,
      tableData,
    );

    let sendFinalInGrpc = true;

    if (tableData.gameType !== RUMMY_TYPES.DEALS) {
      scoreboardData.forEach((scoreData) => {
        const isRebuyPossible = this.isRejoinPossible(
          scoreData,
          playingPlayers,
          tableData,
        );

        if (isRebuyPossible) {
          sendFinalInGrpc = false;
          scoreData.canRebuyTable = isRebuyPossible; // playerwise
          const isRebuyPossibleUsers = [
            ...new Set(tableGameData.rebuyableUsers).add(
              scoreData.userId,
            ),
          ].filter(Boolean);
          tableGameData.rebuyableUsers = isRebuyPossibleUsers;
        }
      });
    }

    const grpcRoundFinishInterface: any = {
      tableData,
      playersGameData,
      tableGameData,
      isFinalRound: true,
      minPointPlayerGameData,
      players,
    };

    let isFinalBattle = playingPlayers.length < 2 && sendFinalInGrpc;

    if (tableData.gameType === RUMMY_TYPES.DEALS) {
      isFinalBattle = this.isFinalRound(
        playingPlayers,
        currentRound,
        tableData.dealsCount,
      );
    }

    const tst = isFinalBattle
      ? 'WinnerDeclared'
      : 'roundWinnerDeclared';

    if (tst === 'WinnerDeclared') {
      tableGameData.tableState = TABLE_STATE.WINNER_DECLARED;
      await eventStateManager.fireEvent(
        tableId,
        STATE_EVENTS.GAME_WINNER,
      );
    } else {
      tableGameData.tableState = TABLE_STATE.ROUND_WINNER_DECLARED;
      await eventStateManager.fireEvent(
        tableId,
        STATE_EVENTS.ROUND_WINNER,
      );
    }
    tableGameplayService.setTableGameplay(
      tableId,
      tableData.currentRound,
      tableGameData,
    );
    const playersInfoData = await Promise.all(
      scoreboardData.map((e) =>
        userProfileService.getUserDetailsById(e.userObjectId),
      ),
    );

    grpcRoundFinishInterface.playersInfoData = playersInfoData;

    const grpcResponse = await this.grpcCallForRoundFinish(
      tableData,
      tableGameData,
      playersGameData,
      minPointPlayerGameData,
      isFinalBattle,
      players,
      playersInfoData,
    );
    await this.updateRoundEndHistory(
      scoreboardData,
      currentRound,
      grpcResponse,
      tableId,
      tableGameData.trumpCard,
      tableGameData.closedDeck,
      tableGameData.opendDeck[tableGameData.opendDeck.length - 1],
    );

    const playersProfileData = await Promise.all(
      playersGameData.map((e: any) =>
        userProfileService.getUserDetailsById(e?.userId),
      ),
    );
    const winnerDeclarePlayerInfo: Array<any> = [];
    const scoreBoardPlayerInfo: Array<ScoreBoardPlayerInfoData> = [];
    let winningCash = 0;
    let winnerUserId = 0;

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
        const grpcPlayerData = grpcResponse?.playersData.find(
          (p: any) => p.userId === playerData?.userId,
        );
        // for new gameTableUI
        // when 2P available at last then change the staus playing to finish to show cards

        const userStatus =
          playerData?.userStatus === PLAYER_STATE.PLAYING
            ? PLAYER_STATE.FINISH
            : playerData?.userStatus;
        let status = playerData?.winLoseStatus;

        if (status === PLAYER_STATUS.WINNER) {
          winningCash = grpcPlayerData.cashWinnings.amount || 0;
          winnerUserId = playerData.userId;
        }
        // const totalPoints = playerData?.dealPoint;

        Logger.info('---playerData.dealPoint,--=--', [
          playerData.dealPoint,
          `
        grpcPlayerData for userid ${
          playerData?.userId
        } and tableid ${tableId}
        ${JSON.stringify(grpcPlayerData)}
        `,
        ]);
        status =
          userStatus === PLAYER_STATE.DROP ? userStatus : status;
        winnerDeclarePlayerInfo.push({
          userId: playerData?.userId,
          status: status,
          winLoseStatus: playerData.winLoseStatus,
          totalPoints: playerData.dealPoint,
        });
        scoreBoardPlayerInfo.push({
          userId: playerData?.userId,
          username: profileData?.userName || '',
          profilePicture: profileData?.avatarUrl || '',
          status,
          userStatus,
          totalPoints: playerData.dealPoint,
          points: playerData?.points,
          meld: meldLabel,
          group: playerData?.groupingCards,
          isRebuyApplicable:
            // tableData.gameType === RUMMY_TYPES.DEALS
            //   ? false
            //   : grpcPlayerData?.isPlayAgain,
            false,
          canPlayAgain: grpcPlayerData?.isPlayAgain,
          rank: grpcPlayerData?.rank || 0,
          winAmount: getWinnings(
            tableData.bootValue,
            grpcPlayerData?.rank || 0,
            scoreboardData.length,
            tableData.currencyType,
            grpcPlayerData?.cashWinnings?.amount || 0,
          ),
          tenant: playerData.tenant,
        });
      }
    }

    let splitAmountPerPlayer = 0;
    let splitUsers = [];
    if (isSplitable?.playingPlayers?.length) {
      splitAmountPerPlayer =
        potValue / isSplitable.playingPlayers.length;
      splitUsers = isSplitable.playingPlayers.map((su) => su.userId);
    }

    const scoreBoardData = {
      tableId,
      potValue,
      tableState: tableGameData.tableState,
      split: Boolean(isSplitable && isSplitable.splitType),
      wildCard: tableGameData.trumpCard,
      papluCard: tableGameData.papluCard,
      winnerUserId:
        tableData.gameType === RUMMY_TYPES.DEALS
          ? winnerUserId
          : minPointPlayerGameData.userId,
      playerInfo: scoreBoardPlayerInfo,
      rebuyable: !sendFinalInGrpc,
      splitAmountPerPlayer,
      splitUsers,
      tie: isGameTie(playingPlayers) && playingPlayers.length > 1,
    };

    await roundScoreBoardService.setRoundScoreBoard(
      tableId,
      currentRound,
      scoreBoardData,
    );

    await round.saveRoundScoreCardData(tableId, scoreBoardData);

    const winnerDeclareData = {
      tableId,
      potValue,
      tableState: tst,
      playerInfo: winnerDeclarePlayerInfo,
      currencyType: tableData.currencyType,
      winnerUserId,
      winningCash,
    };
    await socketOperation.sendEventToRoom(
      tableId,
      EVENTS.WINNER_DECLARE,
      winnerDeclareData,
    );

    await scheduler.addJob.scoreBoard(
      tableId,
      currentRound,
      playingPlayers,
      grpcResponse,
      tableData?.isNewGameTableUI,
    );
    // for (let i = 0; i < playersGameData.length; i++) {
    //   const playerData = playersGameData[i];
    //   if (!playerData) continue;
    //   const { userId } = playerData;
    //   const { score, meld } = cardHandler.groupCardsOnMeld(
    //     playerData.startingGroupingCards,
    //     tableGameData.trumpCard,
    //     tableData.maximumPoints,
    //   );

    //   // instrumentation call
    //   rummyInstrumentations.userPlayedGame({
    //     meld,
    //     playerGamePlayData: playerData,
    //     playersScoreboardData: scoreBoardPlayerInfo,
    //     playersUserProfileData: playersInfoData,
    //     score,
    //     tableConfigData: tableData,
    //     tableGamePlayData: tableGameData,
    //     userAppData: undefined,
    //     userId,
    //     winnerId: minPointPlayerGameData.userId,
    //     roundEndReason: '',
    //   });
    // }
  }

  async updateRoundEndHistory(
    scoreboardData: any[],
    currentRound: number,
    grpcResponse: any,
    tableId: string,
    trumpCard: string,
    closedDeck: Array<string>,
    openTopCard: string,
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
        const cardState = removeEmptyString(
          user.groupingCards.toString(),
        );

        const historyObj = {
          turnNo: length,
          userId: user.userObjectId || user.userId,
          turnStatus: String(user.userStatus).toUpperCase(),
          startState: cardState,
          cardPicked: '',
          cardPickSource: '',
          cardDiscarded: '',
          endState: cardState,
          createdOn: new Date().toISOString(),
          points: user.points,
          totalPoints: user.dealPoint || user.points,
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
          openedDeckTop: openTopCard,
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

      await turnHistoryService.setTurnHistory(
        tableId,
        currentRound,
        currentRoundHistory,
      );
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR updateRoundEndHistory', [tableId, error]);
    }
  }
  isRejoinPossible(
    currPlayer: PlayerGameplay,
    playingPlayers: any[],
    tableData: any,
  ) {
    if (tableData.currencyType === CURRENCY_TYPE.COINS) return false;

    const { maximumPoints } = tableData;
    const {
      TABLE_MAX_REJOINABLE_POINTS_101,
      TABLE_MAX_REJOINABLE_POINTS_201,
      TABLE_MAX_REJOINABLE_POINTS_61,
    } = zk.getConfig();

    if (
      currPlayer.dealPoint < maximumPoints ||
      currPlayer.userStatus === PLAYER_STATE.LEFT
    )
      return false;

    let rejoinMaxPoints = TABLE_MAX_REJOINABLE_POINTS_101;

    if (maximumPoints === POOL_TYPES.TWO_ZERO_ONE)
      rejoinMaxPoints = TABLE_MAX_REJOINABLE_POINTS_201;
    else if (maximumPoints === POOL_TYPES.SIXTY_ONE)
      rejoinMaxPoints = TABLE_MAX_REJOINABLE_POINTS_61;

    const filteredPlayers = playingPlayers.filter(
      (p) => p.dealPoint > rejoinMaxPoints,
    );
    if (filteredPlayers.length === 0 && playingPlayers.length >= 2)
      return true;
    return false;
  }

  calcMinCardsPoints = (playersGameData: any[]) => {
    const playersCount: number = playersGameData.length;
    let minimumPoints = +Infinity;
    let minPointPlayerGameData: any = null;

    for (let i = 0; i < playersCount; ++i) {
      const { userStatus, points } = playersGameData[i];
      if (
        userStatus !== PLAYER_STATE.LOST &&
        userStatus !== PLAYER_STATE.LEFT &&
        userStatus !== PLAYER_STATE.DROP &&
        points < minimumPoints
      ) {
        minimumPoints = points;
        minPointPlayerGameData = playersGameData[i];
      }
    }

    return { minimumPoints, minPointPlayerGameData };
  };

  isFinalRound(
    playingPlayers: (PlayerGameplay | null)[],
    currentRound: number,
    dealsCount: number,
  ): boolean {
    const roundCount = dealsCount;
    playingPlayers.filter((n) => n);
    if (playingPlayers.length === NUMERICAL.ONE) return true;
    if (roundCount === currentRound && !isGameTie(playingPlayers)) {
      return true;
    }
    if (currentRound > roundCount) return true;
    return false;
  }
  async grpcCallForRoundFinish(
    tableData: any,
    tableGameData: any,
    playersGameData: Array<any | null>,
    minPointPlayerGameData: any,
    isFinalRound: boolean,
    histData: Array<PlayerGameplay | null>,
    playersInfoData: any[],
  ) {
    // const config = getConfig();
    let grpcRes: any;
    try {
      Logger.info('grpcCallForRoundFinish : ', [
        tableData,
        tableGameData,
        playersGameData,
        minPointPlayerGameData,
        isFinalRound,
        histData,
        playersInfoData,
      ]);
      const { _id: tableId, currentRound, gameType } = tableData;

      let winnerId = minPointPlayerGameData.userId;
      const roundHistory = await turnHistoryService.getTurnHistory(
        tableId,
        currentRound,
      );

      // const roundHistory = playerHistory.history.pop();
      /**
       * Update winnerId from here
       */

      roundHistory.winnerId = winnerId;

      roundHistory.turnsDetails.forEach((turn) => {
        if (Array.isArray(turn.startState))
          turn.startState = removeEmptyString(
            turn.startState.join(','),
          );

        if (Array.isArray(turn.endState))
          turn.endState = removeEmptyString(turn.endState.join(','));
      });

      await turnHistoryService.setTurnHistory(
        tableId,
        currentRound,
        roundHistory,
      );

      const gameEndReasonMap: { [key: number]: string } = {};
      const lobbyDetails: object = {};
      playersGameData.forEach((player) => {
        if (!player) {
          throw new Error(`PlayerGamePlay not found, ${tableId}`);
        }
        gameEndReasonMap[player.userId] =
          player.userId === winnerId
            ? GAME_END_REASONS.WON
            : player.userStatus;
        lobbyDetails[String(player.userId)] = tableData.lobbyId;
      });

      const battleId = isPointsRummyFormat(gameType)
        ? `${getIdPrefix(gameType)}-${tableId}-${currentRound}`
        : `${getIdPrefix(gameType)}-${tableId}`;

      if (isFinalRound) {
        const formatedHistory: GameHistoryData = {
          _id: battleId,
          cd: new Date().toDateString(),
          tbid: tableId,
          rummyType: tableData.gameType,
          lobbyId: tableData.lobbyId,
          startingUsersCount: tableGameData.seats.length,
          gameDetails: [],
        };

        const turnHistoryPromises = Array.from(
          { length: currentRound },
          (_, i) =>
            i + 1 === currentRound
              ? Promise.resolve(roundHistory)
              : turnHistoryService.getTurnHistory(tableId, i + 1),
        );

        const allTurnHistories = await Promise.all(
          turnHistoryPromises,
        );

        formatedHistory.gameDetails = allTurnHistories.map(
          (history) => ({
            roundNo: history.roundNo,
            winnerId: history.winnerId,
            turnsDetails: history.turnsDetails.map(
              ({
                turnNo,
                userId,
                turnStatus,
                startState,
                cardPicked,
                cardPickSource,
                cardDiscarded,
                endState,
                createdOn,
                points,
                sortedStartState,
                sortedEndState,
                isBot,
                wildCard,
                closedDeck,
                openedDeckTop,
              }) => ({
                turnNo,
                userId,
                turnStatus,
                startState,
                cardPicked,
                cardPickSource,
                cardDiscarded,
                endState,
                createdOn,
                points,
                sortedStartState,
                sortedEndState,
                isBot,
                wildCard,
                closedDeck,
                openedDeckTop,
              }),
            ),
          }),
        );
        Logger.info(`formatedHistory ${tableId} `, [formatedHistory]);
        await turnHistoryService.setGameTurnHistory(
          tableId,
          formatedHistory,
        );
      }

      const userInfo: { id: number; points: number }[] = [];
      let highestDp = 0;
      for (let i = 0; i < playersGameData.length; i++) {
        const element = playersGameData[i];
        if (element) {
          if (
            tableData.gameType === RUMMY_TYPES.DEALS &&
            highestDp < element.dealPoint &&
            isFinalRound
          ) {
            highestDp = element.dealPoint;
            winnerId = element.userId;
          }
          userInfo.push({
            id: element.userId,
            points: isPointsRummyFormat(tableData.gameType)
              ? element.points
              : element.dealPoint,
          });
        }
      }

      const finishBattleRes = await userServiceExt.finishBattle(
        battleId.split('-')[1],
        currentRound.toString(),
        `${tableId}.json`,
        [winnerId],
        userInfo,
        isFinalRound,
      );

      const finishBattleResponse = finishBattleRes.data.playersData
        .sort((a, b) => {
          return parseInt(b.amount, 10) - parseInt(a.amount, 10);
        })
        .map((ele, i) => {
          const matchObj = playersGameData.find(
            (us) => us?.userId === ele.id,
          );
          if (matchObj) {
            matchObj['cashWinnings'] = { amount: ele.amount };
            matchObj['isPlayAgain'] = ele.canPlayAgain;
            matchObj['rank'] = i + 1;
            return matchObj;
          }
          return null;
        })
        .filter((e) => e);

      if (finishBattleRes.status) {
        grpcRes = {
          success: true,
          playersData: finishBattleResponse,
        };
      } else {
        throw new Error(finishBattleRes);
      }
      return grpcRes;
    } catch (error) {
      Logger.error(`INTERNAL_SERVER_ERROR grpcCallForRoundFinish table: ${tableData._id}`, [
        error,
      ]);
    }
  }
  async showScoreboard(
    tableId: string,
    currentRound: number,
    grpcResponse: any,
    isPointsRummy?: boolean,
  ) {
    Logger.info(`showScoreboard for table: ${tableId}`);
    const winnerData =
      await roundScoreBoardService.getRoundScoreBoard(
        tableId,
        currentRound,
      );

    winnerData!.playerInfo =
      await mutantService.addTenantToPlayerInfo(
        winnerData!.playerInfo,
      );
    if (winnerData) {
      winnerData.playerInfo.sort((a, b) => {
        return a.totalPoints - b.totalPoints;
      });
      const futureTime = new Date(
        new Date().getTime() + 15 * 1000,
      ).getTime();
      winnerData.nextRoundTimer = futureTime.toString();
      await socketOperation.sendEventToRoom(
        tableId,
        EVENTS.ROUND_FINISH_SCOREBOARD,
        winnerData,
      );
      isPointsRummy
        ? await winnerPoints.handleRoundFinishPoints(
            tableId,
            currentRound,
            grpcResponse,
          )
        : await this.handleRoundFinish(
            tableId,
            winnerData,
            currentRound,
            grpcResponse,
          );
    }
  }
  async handleRoundFinish(
    tableId: string,
    winnerData: any,
    currentRound: number,
    finalDataGrpc: any,
  ) {
    if (
      Object.keys(finalDataGrpc).length === 0 ||
      !finalDataGrpc.playersData ||
      finalDataGrpc.playersData.length === 0
    ) {
      Logger.error(
        'INTERNAL_SERVER_ERROR CATCH_ERROR: final grpc data not found in afterRoundFinish ',
        [tableId],
      );
      throw new Error(
        `INTERNAL_SERVER_ERROR final grpc data not found in afterRoundFinish,${tableId}`,
      );
    }
    const tableConfigData =
      await tableConfigurationService.getTableConfiguration(tableId, [
        '_id',
        'currentRound',
        'gameType',
        'maximumPoints',
        'shuffleEnabled',
        'gameType',
        'bootValue',
      ]);
    const tableInfo = await tableGameplayService.getTableGameplay(
      tableId,
      currentRound,
      ['tableState', 'seats'],
    );
    if (!tableInfo) {
      throw new Error(
        `table not found in afterRoundFinis ${tableId}`,
      );
    }
    const promiseList = tableInfo.seats.map((seat) =>
      playerGameplayService.getPlayerGameplay(
        seat._id,
        tableId,
        tableConfigData.currentRound,
        ['dealPoint', 'userStatus', 'userId'],
      ),
    );
    const players = await Promise.all(promiseList);

    const playersInfoPromise = tableInfo.seats.map((seat) =>
      userProfileService.getUserDetailsById(seat._id),
    );
    const playersInfo: Array<UserProfile | null> = await Promise.all(
      playersInfoPromise,
    );

    const eliminatedPlayers: Array<any> = [];

    let activePlayers = players;
    if (tableConfigData.gameType === RUMMY_TYPES.POOL) {
      activePlayers = players.filter((player) => {
        if (player) {
          if (
            tableConfigData.maximumPoints === POOL_TYPES.TWO_ZERO_ONE
          ) {
            if (player.dealPoint >= POOL_TYPES.TWO_ZERO_ONE)
              eliminatedPlayers.push(player);
            else return true;
          } else if (
            tableConfigData.maximumPoints === POOL_TYPES.SIXTY_ONE
          ) {
            if (player.dealPoint >= POOL_TYPES.SIXTY_ONE)
              eliminatedPlayers.push(player);
            else return true;
          } else if (player.dealPoint >= POOL_TYPES.ONE_ZERO_ONE) {
            eliminatedPlayers.push(player);
          } else return true;
          return false;
        }
      });
    }

    /**
     * if not found any users then remove the table
     */
    if (activePlayers.length === 0) {
      Logger.info(`afterRoundFinish- ${tableId} -> table deleted`);
      /**
       * TODO: remove the table
       * all redis and mongodb data
       */
      // removeTable(tableId);
      return true;
    }
    tableGameplayService.setTableGameplay(
      tableId,
      tableConfigData.currentRound,
      tableInfo,
    );
    // if (
    //   activePlayers.length > 0 &&
    //   tableInfo.tableState === TABLE_STATE.WINNER_DECLARED
    // ) {
    //   // set playMoreDelayTimer
    //   // const remainPlayers = players.filter(
    //   //   (player: any) => player.userStatus !== PLAYER_STATE.LEFT,
    //   // );
    //   // scheduler.addJob.playMoreDelay(
    //   //   tableId,
    //   //   tableInfo,
    //   //   remainPlayers,
    //   //   finalDataGrpc,
    //   //   tableConfigData,
    //   // );
    // }

    //// to do
    if (
      tableConfigData.gameType === RUMMY_TYPES.DEALS &&
      tableInfo.tableState === TABLE_STATE.ROUND_WINNER_DECLARED
    ) {
      const lock = await redlock.Lock.acquire(
        [`lock:${tableId}`],
        2000,
      );
      Logger.info(
        `Lock acquired, in setupNextRound resource:, ${lock?.resource}`,
      );
      await this.setupNextRound(
        tableConfigData,
        eliminatedPlayers,
        playersInfo,
        finalDataGrpc,
        false,
        activePlayers,
        winnerData,
      );
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
    } else if (tableConfigData.gameType === RUMMY_TYPES.POOL) {
      await this.setupNextRound(
        tableConfigData,
        eliminatedPlayers,
        playersInfo,
        finalDataGrpc,
        false,
        activePlayers,
        winnerData,
      );
    }

    return undefined;
  }

  async setupNextRound(
    tableInfo: any,
    eliminatedPlayers: any[],
    usersInfo: Array<UserProfile | null>,
    finalDataGrpc: any,
    winnerIsColluder = false,
    activePlayers: any,
    winData: any,
  ) {
    Logger.info(`setupNextRound`, [
      tableInfo,
      eliminatedPlayers,
      winnerIsColluder,
    ]);
    const { currentRound, _id: tableId } = tableInfo;
    const tableGameData = await tableGameplayService.getTableGameplay(
      tableId,
      currentRound,
      [
        'isRebuyable',
        'seats',
        'tableState',
        'tableCurrentTimer',
        'potValue',
        'totalPlayerPoints',
        'noOfPlayers',
        'rebuyableUsers',
        'standupUsers',
      ],
    );
    if (!tableGameData)
      throw new Error(
        `table game data not present setupNextRound ${tableId}`,
      );

    if (activePlayers.length > 1 || winData?.rebuyable) {
      const isTableRejoinable = winData.playerInfo.find(
        (player: ScoreBoardPlayerInfoData) =>
          player.isRebuyApplicable,
      );
      const isTableSplitable = winData.split;
      Logger.info(`setupNextRound >> if >> ${tableId}`, [
        isTableRejoinable,
        isTableSplitable,
      ]);
      if (!isTableRejoinable) {
        const LeaveTableHandler = (
          await import('../../services/leaveTable')
        ).default;
        eliminatedPlayers.forEach(async (user) => {
          if (user.userStatus !== PLAYER_STATE.LEFT) {
            // send eliminated users leave table
            LeaveTableHandler.main(
              {
                tableId,
                reason: LEAVE_TABLE_REASONS.ELIMINATED,
              },
              user.userId,
            );
          }
        });
        // check this
        await new Promise((resolve) => {
          setTimeout(resolve, 500);
        });
      }

      const nextRoundTimer =
        isTableRejoinable || isTableSplitable
          ? NUMERICAL.FIFTEEN
          : NUMERICAL.FIVE;

      // tableGameData.isSplitable = isTableSplitable;
      tableGameData.isRebuyable = isTableRejoinable;

      const { tableGamePlayData } = await round.createNewRound(
        tableInfo,
        tableGameData,
        nextRoundTimer,
        usersInfo,
      );

      // set round timer
      await scheduler.addJob.roundTimerStart(
        tableId,
        tableInfo.currentRound,
        nextRoundTimer,
        eliminatedPlayers,
        isTableRejoinable,
      );
      // seat shuffle
      if (tableInfo.shuffleEnabled) {
        Logger.info(`seat shuffling --- table: ${tableId}`, [
          isTableRejoinable,
          eliminatedPlayers,
        ]);

        seatShuffle(
          tableId,
          currentRound,
          tableGamePlayData,
          eliminatedPlayers,
          isTableRejoinable,
          winData,
        );
      }

      Logger.info(
        `-setup round for ${
          currentRound + 1
        } round for table ${tableId}`,
      );
    } else {
      // await Lib.Round.dumpRounData(tableInfo._id, tableInfo.currentRound);
    }
  }

  async handleRoundTimerExpired(data: {
    nextRoundTimer: number;
    tableId: string;
    currentRound: number;
    eliminatedPlayers: any;
    isTableRejoinable: boolean;
  }) {
    const {
      nextRoundTimer,
      tableId,
      currentRound,
      eliminatedPlayers,
      isTableRejoinable,
    } = data;
    Logger.info(
      `handleRoundTimerExpired: RTS  ${tableId}:${currentRound}`,
    );
    const roundTimerStartedData = {
      tableId,
      currentRound,
      timer: dateUtils.addEpochTimeInSeconds(nextRoundTimer),
    };
    await socketOperation.sendEventToRoom(
      tableId,
      EVENTS.ROUND_TIMER_STARTED,
      roundTimerStartedData,
    );

    await scheduler.addJob.roundStart(
      tableId,
      nextRoundTimer * NUMERICAL.THOUSAND,
    );

    const playingEliminatedPlayers = eliminatedPlayers.filter(
      (player: any) => player.userStatus !== PLAYER_STATE.LEFT,
    );

    if (isTableRejoinable) {
      scheduler.addJob.kickEliminatedUsers(
        (nextRoundTimer - 5) * NUMERICAL.THOUSAND,
        tableId,
        playingEliminatedPlayers,
      );
    } else {
      await kickEliminatedUsers(tableId, playingEliminatedPlayers);
    }
  }
}

export const winner = new Winner();
