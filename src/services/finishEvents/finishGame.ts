import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import _ from 'underscore';
import {
  EVENTS,
  GAME_END_REASONS,
  NUMERICAL,
  PLAYER_STATE,
  POINTS,
  RUMMY_TYPES,
} from '../../constants';
import { STATE_EVENTS, USER_EVENTS } from '../../constants/events';
import { TURN_HISTORY } from '../../constants/turnHistory';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { turnHistoryService } from '../../db/turnHistory/index';
import { userProfileService } from '../../db/userProfile';
import { MELD } from '../../objectModels';
import { networkParams } from '../../objectModels/playerGameplay';
import { TableConfigFinishGame } from '../../objectModels/tableconfiguration';
import { SeatSchema } from '../../objectModels/tableGameplay';
import { socketOperation } from '../../socketHandler/socketOperation';
import { eventStateManager } from '../../state/events';
import {
  isPointsRummyFormat,
  issGroupingCardAndCurrentCardSame,
  roundInt,
} from '../../utils';
import { cardUtils } from '../../utils/cards';
import { dateUtils } from '../../utils/date';
import { CancelBattleError } from '../../utils/errors/index';
import { redlock } from '../../utils/lock/redlock';
import { cancelBattle } from '../gameplay/cancelBattle';
import { cardHandler } from '../gameplay/cardHandler';
import { changeTurn } from '../gameplay/turn';
import { scheduler } from '../schedulerQueue';
import { finishGameDeals } from './deals/finishGame';
import { declareCardEvent } from './declareCard';
import { dropGame } from './dropGame';
import { winner } from './winner';
import { winnerPoints } from './winnerPoints';
import { GAME_END_REASONS_INSTRUMENTATION } from '../../constants/gameEndReasons';

class FinishGame {
  async finishGame(
    meld: Array<string>,
    tableId: string,
    userId: number,
    group: Array<Array<string>>,
    networkParams?: networkParams,
  ) {
    try {
      Logger.info(
        `Finish game called tableId: ${tableId}, userId: ${userId}`,
      );
      const tableConfigData =
        (await tableConfigurationService.getTableConfiguration(
          tableId,
          [
            '_id',
            'userFinishTimer',
            'currentRound',
            'gameType',
            'maximumPoints',
          ],
        )) as TableConfigFinishGame;

      const { currentRound } = tableConfigData;
      const tableGameplayData =
        await tableGameplayService.getTableGameplay(
          tableId,
          currentRound,
          [
            'seats',
            'closedDeck',
            'finishPlayer',
            'declarePlayer',
            'opendDeck',
            'trumpCard',
          ],
        );
      if (!tableGameplayData) {
        throw Error(
          `TGP not found for table ${tableId} for finishGame`,
        );
      }

      const { seats, trumpCard, declarePlayer } = tableGameplayData;
      const pgps = await Promise.all(
        seats.map((seat) =>
          playerGameplayService.getPlayerGameplay(
            seat._id,
            tableId,
            currentRound,
            [
              'userId',
              'userStatus',
              'isFirstTurn',
              'dealPoint',
              'points',
              'meld',
              'groupingCards',
              'dealPoint',
              'tenant',
              'seatIndex',
            ],
          ),
        ),
      );

      const playersGameData: any[] = [];
      pgps.forEach((pgp: any | null) => {
        if (pgp) playersGameData.push(pgp);
      });

      const declarePlayerGameData =
        playersGameData.find((ele) => ele.userId === declarePlayer) ||
        ({} as any);

      const finishPlayerGameData: any =
        playersGameData.find((ele) => ele.userId === userId) ||
        ({} as any);

      if (
        finishPlayerGameData.userStatus === PLAYER_STATE.DECLARED ||
        finishPlayerGameData.userStatus === PLAYER_STATE.PLAYING
      ) {
        // Calculate card points
        const { score: points } = cardHandler.groupCardsOnMeld(
          group,
          trumpCard,
          tableConfigData.maximumPoints,
        );
        const isValidSequence = cardUtils.areSequencesValid(meld);

        /**
         * if user has declared in his first turn
         * then devide points by 2
         */
        const cardPoints = finishPlayerGameData.isFirstTurn
          ? roundInt(points / 2, 0)
          : points;

        // let isPointAdded = false;
        // if (userId !== declarePlayer) {
        //   isPointAdded = true;
        // }

        if (userId !== declarePlayer) {
          finishPlayerGameData.dealPoint += cardPoints;
        }
        finishPlayerGameData.userStatus = PLAYER_STATE.FINISH;
        finishPlayerGameData.points = cardPoints;
        Logger.info('-finishPlayerGameData.dealPoint--', [
          finishPlayerGameData.dealPoint,
          finishPlayerGameData.points,
          '--finishPlayerGameData.points---',
          finishPlayerGameData.userId,
          cardPoints,
          userId !== declarePlayer,
          tableId,
        ]);

        tableGameplayData.finishPlayer.push(
          finishPlayerGameData.userId,
        );
        const sequenceCount = cardUtils.sequenceCount(meld);
        if (
          cardPoints === 0 &&
          declarePlayer !== finishPlayerGameData.userId &&
          sequenceCount[MELD.PURE] + sequenceCount[MELD.SEQUENCE] > 1
        ) {
          finishPlayerGameData.points = NUMERICAL.TWO;
        }

        const finishRoundEventData = {
          tableId,
          userId,
          totalPoints: finishPlayerGameData.dealPoint,
        };

        await Promise.all([
          socketOperation.sendEventToRoom(
            tableId,
            EVENTS.FINISH_ROUND,
            finishRoundEventData,
          ),
          eventStateManager.fireEventUser(
            tableId,
            userId,
            USER_EVENTS.FINISH,
            networkParams?.timeStamp ||
              dateUtils.getCurrentEpochTime(),
          ),
        ]);

        // cancelling finish timer
        if (finishPlayerGameData.userId === declarePlayer) {
          await scheduler.cancelJob.finishTimer(
            tableId,
            currentRound,
          );
        }

        if (userId !== declarePlayer) {
          if (isValidSequence && cardPoints === 0) {
            /**
             * If user is not the declarePlayer but
             * If card points is 0 &&
             * contains valid seq AKA valid declare
             */
            finishPlayerGameData.points =
              POINTS.LATE_DECLARE_PENALTY_POINTS;
            finishPlayerGameData.dealPoint +=
              finishPlayerGameData.points;
          }
        }

        Logger.info(
          `finishGame: update tgp, pgp for table: ${tableId}`,
          [tableGameplayData, playersGameData],
        );
        await Promise.all([
          tableGameplayService.setTableGameplay(
            tableId,
            currentRound,
            tableGameplayData,
          ),
          playerGameplayService.setPlayerGameplay(
            userId,
            tableId,
            currentRound,
            finishPlayerGameData,
          ),
        ]);

        let isInvalidDeclare = false;
        if (
          userId === declarePlayer &&
          isValidSequence &&
          cardPoints === NUMERICAL.ZERO
        ) {
          const currentRoundHistory =
            await turnHistoryService.getTurnHistory(
              tableId,
              currentRound,
            );
          currentRoundHistory.turnsDetails[
            currentRoundHistory.turnsDetails.length - 1
          ].turnStatus = TURN_HISTORY.VALID_DECLARE;
          currentRoundHistory.turnsDetails[
            currentRoundHistory.turnsDetails.length - 1
          ].points = 0;
          /**
           * If user is the declarePlayer &&
           * card points is 0 &&
           * contains valid seq AKA valid declare
           */
          await Promise.all([
            declareCardEvent.scheduleFinishTimer(
              tableConfigData,
              tableGameplayData,
              playersGameData,
              true,
            ),
            turnHistoryService.setTurnHistory(
              tableId,
              currentRound,
              currentRoundHistory,
            ),
            eventStateManager.fireEvent(
              tableId,
              STATE_EVENTS.VALID_FINISH,
            ),
          ]);
        } else if (userId === declarePlayer) {
          // if invalid declare
          /**
           * as use lock in parent func hence
           * don't use await here to avoid lock conflicts
           */
          isInvalidDeclare = true;

          finishPlayerGameData.gameEndReason =
            GAME_END_REASONS_INSTRUMENTATION.INVALID_DECLARE;
          await playerGameplayService.setPlayerGameplay(
            userId,
            tableId,
            currentRound,
            finishPlayerGameData,
          );

          const invalidFinishData = {
            tableId,
            userId,
            openCard: tableGameplayData.opendDeck.slice(-1)[0],
            score: finishPlayerGameData.points,
            meld,
          };
          if (finishPlayerGameData.userId === declarePlayer) {
            await Promise.all([
              eventStateManager.fireEvent(
                tableId,
                STATE_EVENTS.INVALID_FINISH,
              ),
              socketOperation.sendEventToRoom(
                tableId,
                EVENTS.INVALID_DECLARE_FINISH,
                invalidFinishData,
              ),
            ]);
          }
          await dropGame(
            { tableId },
            { userId },
            GAME_END_REASONS.INVALID_DECLARE,
          );
        }

        /**
         * send room event with player data to show declaring scoreboard
         */
        if (!isInvalidDeclare) {
          await this.showRoundDeclaredScoreBoard(
            tableId,
            seats,
            playersGameData,
            tableGameplayData.trumpCard,
          );
        }
        //-------

        const activePlayers = playersGameData.filter(
          (ele) => ele.userStatus === PLAYER_STATE.PLAYING,
        );

        if (!activePlayers.length) {
          Logger.info(' everyone has finished -----', [
            tableId,
            playersGameData,
          ]);
          // if all players finished or any declare player do invalid decalre(ps > 0)
          // const jobIds = `${PLAYER_STATE.FINISH}-${tableId}-${currentRound}-true`;
          await scheduler.cancelJob.finishTimer(
            tableId,
            currentRound,
            true, // forOthers
          );
          // finishPlayerGameData.dealPoint +=
          //   finishPlayerGameData.cardPoints;

          Logger.info(' helperAllPlayersFinished is called -----', [
            tableId,
            playersGameData,
          ]);
          await this.helperAllPlayersFinished(
            tableConfigData,
            tableGameplayData,
            playersGameData,
            declarePlayerGameData,
            finishPlayerGameData,
            userId,
            currentRound,
          );
        }
      }
    } catch (error: any) {
      if (error instanceof CancelBattleError) {
        await cancelBattle.cancelBattle(tableId, error);
      }
      Logger.error(`INTERNAL_SERVER_ERROR error occurred at finishGame `, [error]);
    }
  }

  /**
   * send room event with player data to show declaring scoreboard
   */
  async showRoundDeclaredScoreBoard(
    tableId: string,
    seats: Array<SeatSchema>,
    playersGameData: Array<any>,
    wildCard = '',
  ) {
    const seatCount = seats.length;
    const declareFinishScoreBoardData: Array<any> = [];
    for (let k = 0; k < seatCount; ++k) {
      const playerGamePlayData = playersGameData[k];
      if (!playerGamePlayData) continue;
      playerGamePlayData.userStatus =
        playerGamePlayData.userStatus.toLowerCase();

      declareFinishScoreBoardData.push(playerGamePlayData);
    }

    const playersProfileData = await Promise.all(
      playersGameData.map((e: any) =>
        userProfileService.getUserDetailsById(e?.userId),
      ),
    );

    const scoreBoardPlayerInfo: any = [];
    declareFinishScoreBoardData.map((playerData) => {
      if (playerData) {
        const profileData = playersProfileData.find(
          (e: any) => e.id === playerData?.userId,
        );
        const meldLabel = cardHandler.labelTheMeld({
          meld: playerData?.meld,
          cardsGroup: playerData?.groupingCards,
        });

        scoreBoardPlayerInfo.push({
          userId: playerData?.userId,
          username: profileData?.userName || '',
          userStatus: playerData?.userStatus || '',
          totalPoints: playerData?.dealPoint || 0,
          points: playerData?.points || 0,
          meld: meldLabel,
          group: playerData?.groupingCards,
          tenant: playerData.tenant,
        });
      }
    });
    const declareScoreBoardData = {
      tableId,
      wildCard,
      playerInfo: scoreBoardPlayerInfo,
    };
    await socketOperation.sendEventToRoom(
      tableId,
      EVENTS.ROUND_DECLARE_SCOREBOARD,
      declareScoreBoardData,
    );
  }

  async helperAllPlayersFinished(
    tableInfo: TableConfigFinishGame,
    tableGamePlay: any,
    playerList: any[],
    declarePlayerInfo: any,
    playerGamePlay: any,
    userObjectId: number,
    currentRound: number,
  ) {
    Logger.info(' helperAllPlayersFinished :', [
      tableInfo._id,
      tableInfo,
      tableGamePlay,
      playerList,
      declarePlayerInfo,
      playerGamePlay,
      userObjectId,
      currentRound,
    ]);
    let invalidFinishData;
    try {
      const tableId = tableInfo._id;
      const playerInfo = playerList;
      let playersIndex = playerInfo.map((id) => id.seatIndex);

      playersIndex = _.without(
        playersIndex,
        declarePlayerInfo.seatIndex,
      );
      const sequenceCount = cardUtils.sequenceCount(
        declarePlayerInfo.meld,
      );
      /**
       * If declarePlayer has left the game after declaring
       * Ignore the declare & resume the game and change the turn
       */
      if (
        tableGamePlay.declarePlayer &&
        declarePlayerInfo.userStatus === PLAYER_STATE.LEFT
      ) {
        invalidFinishData = {
          tableId: tableId,
          userId: declarePlayerInfo.seatIndex,
          openCard:
            tableGamePlay.opendDeck[
              tableGamePlay.opendDeck.length - 1
            ],
          score: playerGamePlay.points,
        };
        await changeTurn(tableInfo._id);
      } else {
        /**
         * Else proceed with the round / game winner logic
         */
        // declare user has valid rummy hence set winner
        const declPlayerValid = cardUtils.areSequencesValid(
          declarePlayerInfo.meld,
        );

        const currentRoundHistory =
          await turnHistoryService.getTurnHistory(
            tableId,
            currentRound,
          );
        currentRoundHistory.turnsDetails[
          currentRoundHistory.turnsDetails.length - 1
        ].turnStatus = TURN_HISTORY.VALID_DECLARE;
        currentRoundHistory.turnsDetails[
          currentRoundHistory.turnsDetails.length - 1
        ].points = declarePlayerInfo.points;

        /**
         * If declarePlayer has valid declare
         */
        if (declPlayerValid) {
          if (isPointsRummyFormat(tableInfo.gameType)) {
            const winnerData = await winnerPoints.declareWinner(
              tableId,
            );
            return winnerData;
          } else {
            const winnerData = await winner.handleWinner(
              playerGamePlay,
              tableInfo,
              tableGamePlay,
            );
            return winnerData;
          }
        }

        currentRoundHistory.turnsDetails[
          currentRoundHistory.turnsDetails.length - 1
        ].turnStatus = TURN_HISTORY.INVALID_DECLARE;

        await this.handleOtherPlayers(
          tableInfo,
          playerInfo,
          playerGamePlay,
          currentRound,
          tableGamePlay,
        );
        Logger.info(
          'finally calling dropGame inside helperAllPlayersFinished----',
          [
            tableId,
            userObjectId,
            tableInfo,
            tableGamePlay,
            playerList,
            declarePlayerInfo,
            playerGamePlay,
            userObjectId,
            currentRound,
          ],
        );
        await dropGame(
          { tableId: tableId },
          { userId: userObjectId },
        );

        turnHistoryService.setTurnHistory(
          tableId,
          currentRound,
          currentRoundHistory,
        );
      }
    } catch (error: any) {
      Logger.error('INTERNAL_SERVER_ERROR CATCH_ERROR:', [
        'helperAllPlayersFinished',
        tableInfo._id,
        error.message,
        error,
        tableInfo,
      ]);
      invalidFinishData = { error: error.message };
    } finally {
      if (
        tableGamePlay.declarePlayer === userObjectId &&
        invalidFinishData &&
        invalidFinishData.declarePlayer
      ) {
        await socketOperation.sendEventToRoom(
          tableInfo._id,
          EVENTS.INVALID_DECLARE_FINISH,
          invalidFinishData,
        );
      }
    }
    return true;
  }

  async handleOtherPlayers(
    tableInfo: TableConfigFinishGame,
    playerInfo: any[],
    playerGamePlay: any,
    currentRound: number,
    tableGamePlay: any,
  ) {
    Logger.info('otherPlayer :', [
      tableInfo._id,
      tableInfo,
      playerInfo,
      playerGamePlay,
      currentRound,
      tableGamePlay,
    ]);
    playerInfo.map(async (playerData) => {
      if (
        !_.isEmpty(playerData) &&
        playerData.userStatus !== null &&
        playerData.userStatus === PLAYER_STATE.FINISH
      ) {
        const player = await playerGameplayService.getPlayerGameplay(
          playerData.userId,
          tableInfo._id,
          currentRound,
          ['userStatus'],
        );
        if (!player)
          throw new Error(
            `Player data not set at handleOtherplayers`,
          );
        player.userStatus = PLAYER_STATE.PLAYING;
        await playerGameplayService.setPlayerGameplay(
          playerData.userId,
          tableInfo._id,
          currentRound,
          player,
        );
      }
    });
    // await setTGPData(
    //   tableInfo,
    //   currentRound,
    //   tableGamePlay,
    //   playerGamePlay,
    // );
  }
  async setFinishAfter(
    userIdArray: number[],
    tableId: string,
    currentRound: number,
  ) {
    const [tableGameData, tableConfigData] = await Promise.all([
      tableGameplayService.getTableGameplay(tableId, currentRound, [
        'seats',
      ]),
      tableConfigurationService.getTableConfiguration(tableId, [
        'gameType',
      ]),
    ]);

    if (!tableGameData) {
      throw new Error(
        `tableGameData not found table: ${tableId}-${currentRound}, from setFinishAfter`,
      );
    }
    const { seats } = tableGameData;
    const playersGameData = await Promise.all(
      seats.map((seat) =>
        playerGameplayService.getPlayerGameplay(
          seat._id,
          tableId,
          currentRound,
          ['meld', 'userId', 'userStatus', 'groupingCards'],
        ),
      ),
    );
    Logger.info('autoFinish', [
      tableId,
      userIdArray,
      playersGameData,
    ]);
    if (userIdArray && userIdArray.length) {
      for (let i = 0; i < userIdArray.length; i++) {
        const userObjectId = userIdArray[i];
        const playerOne = playersGameData.find(
          (pl) =>
            pl?.userId === userObjectId &&
            (pl.userStatus === PLAYER_STATE.PLAYING ||
              pl.userStatus === PLAYER_STATE.DECLARED),
        );
        if (playerOne) {
          if (tableConfigData.gameType === RUMMY_TYPES.DEALS) {
            await finishGameDeals.finishGame(
              playerOne.meld,
              tableId,
              playerOne.userId,
              playerOne.groupingCards,
            );
          } else {
            await this.finishGame(
              playerOne.meld,
              tableId,
              playerOne.userId,
              playerOne.groupingCards,
            );
          }
        }
      }
    }
    return true;
  }

  async finishRound(data, socket, networkParams: networkParams) {
    let lock!: Lock;
    try {
      let { group } = data;
      const { tableId } = data;
      const { userId } = socket;

      lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
      Logger.info(
        `Lock acquired, in finishRound on resource:, ${lock.resource}`,
      );

      const tableConfig =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          ['currentRound', 'maximumPoints', 'gameType'],
        );
      const { currentRound } = tableConfig;
      const [tableGameplayData, playerGameplayData] =
        await Promise.all([
          tableGameplayService.getTableGameplay(
            tableId,
            currentRound,
            ['trumpCard'],
          ),
          playerGameplayService.getPlayerGameplay(
            userId,
            tableId,
            currentRound,
            ['currentCards', 'groupingCards'],
          ),
        ]);
      if (!tableGameplayData || !playerGameplayData) {
        throw new Error(
          `tableGameplayData or playerGameplayData not found table: ${tableId}-${currentRound}, from finishRound`,
        );
      }
      if (
        !issGroupingCardAndCurrentCardSame(
          [...playerGameplayData.currentCards],
          group,
        )
      ) {
        Logger.info(
          `Grouping is not the same between client and server in finish ${tableId}:${userId}, group ${group} and current grouping ${playerGameplayData.groupingCards}`,
        );
        group = playerGameplayData.groupingCards;
      }
      if (!tableGameplayData)
        throw new Error(`Gameplay data not set finish Round`);
      const { meld, score, meldLabel } = cardHandler.groupCardsOnMeld(
        group,
        tableGameplayData.trumpCard,
        tableConfig.maximumPoints,
      );

      if (tableConfig.gameType === RUMMY_TYPES.DEALS) {
        await finishGameDeals.finishGame(
          meld,
          tableId,
          userId,
          group,
          networkParams,
        );
      } else {
        await this.finishGame(
          meld,
          tableId,
          userId,
          group,
          networkParams,
        );
      }

      return {
        tableId,
        score,
        meld: meldLabel,
        group,
        isValid: true, // change this
      };
    } catch (err) {
      Logger.error(`INTERNAL_SERVER_ERROR finishRound `, [err]);
    } finally {
      try {
        if (lock && lock instanceof Lock) {
          await redlock.Lock.release(lock);
          Logger.info(
            `Lock releasing, in finishRound; resource:, ${lock.resource}`,
          );
        }
      } catch (err: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock on finishRound: ${err}`, [err]
        );
      }
    }
  }
}

export const finishGame = new FinishGame();
