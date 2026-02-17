import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import { zk } from '../../connections';
import { CURRENCY_TYPE, PLAYER_STATE, STRINGS, TURN_HISTORY } from '../../constants';
import { EVENTS, STATE_EVENTS } from '../../constants/events';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { turnHistoryService } from '../../db/turnHistory';
import { userProfileService } from '../../db/userProfile';
import {
  PlayerGameplay,
  PlayerTurnTimerData,
  SeatSchema,
} from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import {
  removeEmptyString,
  removePickCardFromCards,
} from '../../utils';
import {
  CacheDataMismatchFound,
  StateError,
  TurnMismatchError,
} from '../../utils/errors';
import { CancelBattleError } from '../../utils/errors/index';
import { redlock } from '../../utils/lock/redlock';
import { shuffleCards } from '../../utils/suffleCard';
import { sortedCards } from '../../utils/turnHistory';
import { dropGame } from '../finishEvents/dropGame';
import { cancelBattle } from './cancelBattle';
import { cardHandler } from './cardHandler';
import { round } from './round';
import { GAME_END_REASONS_INSTRUMENTATION } from '../../constants/gameEndReasons';
import addMixpanelEvent from '../../mixpanel';
import { sendDropMixpanel } from '../../mixpanel/helper';
/**
 * - throw card will call it automatically
 * - expire turn
 * - dropGame will call it if current turn player has droped game
 *
 * @param tableId
 */
export const changeTurn = async (tableId: string) => {
  try {
    const tableData =
      await tableConfigurationService.getTableConfiguration(tableId, [
        'currentRound',
      ]);
    const { currentRound } = tableData;
    const tableGamePlay = await tableGameplayService.getTableGameplay(
      tableId,
      currentRound,
      ['currentTurn', 'seats'],
    );

    if (!tableGamePlay) {
      throw Error('TableGamePlay not available!');
    }
    const playersGameData_1 = (
      await Promise.all(
        tableGamePlay.seats.map((ele: SeatSchema) =>
          playerGameplayService.getPlayerGameplay(
            ele._id,
            tableId,
            currentRound,
            [
              'userId',
              'userStatus',
              'isFirstTurn',
              'groupingCards',
              'timeoutCount',
              'currentCards',
              'meld',
            ],
          ),
        ),
      )
    ).filter(Boolean);
    const playersGameData: any[] = [];
    playersGameData_1.forEach((pgp) => {
      if (pgp) {
        playersGameData.push(pgp);
      }
    });

    if (playersGameData.length === 0) {
      throw Error('No PlayerGamePlay available!');
    }

    Logger.info(
      `changeTurn on ${tableId} , Round ${currentRound} with TGP: `,
      [playersGameData.map((pgp) => pgp?.userId), tableGamePlay],
    );

    const nextTurn = round.getNextPlayer(
      tableGamePlay.currentTurn,
      playersGameData,
    );

    Logger.info(
      `turn changed, current turn user ${nextTurn} for table ${tableId}`,
    );
    await round.startUserTurn(
      tableId,
      currentRound,
      nextTurn,
      playersGameData,
    );
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR changeTurn found error for table ${tableId} `, [
      error,
    ]);
    if (error instanceof CancelBattleError) {
      await cancelBattle.cancelBattle(tableId, error);
    } else {
      throw new StateError(error.message);
    }
  }
};

// scheduler initiated function
export async function onTurnExpire(turndata: PlayerTurnTimerData) {
  Logger.info('Starting onTurnExpire ', [turndata]);
  let lock!: Lock | undefined;
  try {
    if (!turndata || !turndata.tableId || !turndata.userId) {
      throw new Error(
        `onTurnExpire:>> Error: tableId/userId not found`,
      );
    }
    const { tableId, userId } = turndata;

    lock = await redlock.Lock.acquire(
      [`lock:${turndata.tableId}`],
      2000,
    );
    Logger.info(
      `Lock acquired onTurnExpire on resource:, ${lock.resource} `,
    );

    const tableConfig =
      await tableConfigurationService.getTableConfiguration(tableId, [
        'currentRound',
        'maximumPoints',
        'pileDiscardEnabled',
        'gameId',
        'maximumSeat',
        'maximumPoints',
        "currencyType",
        "bootValue"
      ]);
    const { currentRound, gameId, maximumPoints, currencyType, bootValue, maximumSeat } = tableConfig;

    // get TGP, PGP, TURN_HISTORY, ODC
    const promiseList = await Promise.all([
      tableGameplayService.getTableGameplay(tableId, currentRound, [
        'opendDeck',
        'closedDeck',
        'trumpCard',
        'papluCard',
        'currentTurn',
      ]),
      playerGameplayService.getPlayerGameplay(
        userId,
        tableId,
        currentRound,
        [
          'userId',
          'currentCards',
          'groupingCards',
          'meld',
          'isFirstTurn',
          'userStatus',
          'timeoutCount',
        ],
      ),
      turnHistoryService.getTurnHistory(tableId, currentRound),
      tableGameplayService.getOpenDiscardedCards(
        tableId,
        currentRound,
      ),
    ]);
    const userProfileData =
      await userProfileService.getOrCreateUserDetailsById(userId);

    const [tableGameData, playerGamePlay, currentRoundHistory] =
      promiseList;
    let [, , , openDiscardedCardsData] = promiseList;

    Logger.info('onTurnExpire: TGP, PGP', [
      tableConfig,
      tableGameData,
      playerGamePlay,
      turndata.tableId
    ]);

    if (
      !(
        tableGameData?.currentTurn === userId &&
        playerGamePlay?.userStatus === PLAYER_STATE.PLAYING
      )
    ) {
      const err = `On Table ${tableId}: current turn in table does not match with the turn expire user; 
      tableGameData.currentTurn is ${tableGameData?.currentTurn},
      user is: ${userId};\n
      "User status": ${playerGamePlay?.userStatus}`;
      Logger.error(`INTERNAL_SERVER_ERROR`, [err]);

      if (!tableGameData || !tableGameData?.currentTurn) {
        throw new CacheDataMismatchFound(err);
      }
      throw new TurnMismatchError(err);
    }

    if (!openDiscardedCardsData?.openCards) {
      openDiscardedCardsData = {
        openCards: [],
      };
    }

    if (playerGamePlay.isFirstTurn) {
      playerGamePlay.isFirstTurn = false;
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
        false,
        true
      );
    }
    const turnObject =
      currentRoundHistory.turnsDetails[
        currentRoundHistory.turnsDetails.length - 1
      ];

    let lastPickCard = '';
    let groupCards = playerGamePlay.groupingCards;
    if (playerGamePlay.currentCards.length > 13) {
      // PGP- update currentCards, groupingCards,lastPickCard, set tCount =0
      lastPickCard = playerGamePlay.currentCards.pop() || '';

      groupCards = removePickCardFromCards(
        lastPickCard,
        playerGamePlay.groupingCards,
      );
      playerGamePlay.lastPickCard = lastPickCard;

      // update tableGameData
      tableGameData.opendDeck.push(lastPickCard);
      turnObject.cardDiscarded = lastPickCard;

      if (openDiscardedCardsData?.openCards) {
        const { openCards } = openDiscardedCardsData;
        openCards.push({
          userId,
          card: lastPickCard,
        });
      }
    }

    const { score, meld, meldLabel } = cardHandler.groupCardsOnMeld(
      groupCards,
      tableGameData.trumpCard,
      tableConfig.maximumPoints,
      tableGameData.papluCard,
    );
    playerGamePlay.groupingCards = groupCards;
    playerGamePlay.meld = meld;
    playerGamePlay.timeoutCount += 1;

    turnObject.turnStatus = TURN_HISTORY.TIMEOUT;
    turnObject.endState = removeEmptyString(
      playerGamePlay.currentCards.toString(),
    );
    turnObject.sortedEndState = sortedCards(
      playerGamePlay.groupingCards,
      playerGamePlay.meld,
    ); // Needed it or not, to verify
    turnObject.points = score;


    const eventResponse = {
      userId,
      tableId,
      lastPickCard, // If not picked then lastPickCard will not be available. // For user
    };
    const eventResponseClientGrp = {
      score,
      meld: meldLabel,
      group: groupCards,
      isValid: true,
    };

    // Open one card from closed deck
    // If discard not enable, and picked from pile
    Logger.info('on Turn Expire', [
      playerGamePlay.currentCards,
      tableConfig,
      turnObject,
      lastPickCard,
      eventResponse,
    ]);
    if (
      tableConfig.pileDiscardEnabled &&
      (turnObject.cardPickSource === TURN_HISTORY.OPENED_DECK ||
        !lastPickCard)
    ) {
      let lastCardOpendeck: string;
      if (tableGameData.closedDeck.length === 0) {
        lastCardOpendeck = tableGameData.opendDeck.pop() || '';
        tableGameData.closedDeck = shuffleCards(
          tableGameData.opendDeck,
        );
        tableGameData.opendDeck = [lastCardOpendeck];
      }

      const closedDeckCard = tableGameData.closedDeck.pop();
      if (closedDeckCard)
        tableGameData.opendDeck.push(closedDeckCard);

      Object.assign(eventResponse, {
        openDeckCardToShow: closedDeckCard,
        toastMsg: `${userProfileData.userName} Timeout. \nDiscarding the top card from closed deck to continue`,
      });

      if (openDiscardedCardsData?.openCards && closedDeckCard) {
        const { openCards } = openDiscardedCardsData;
        openCards.push({
          userId: 0,
          card: closedDeckCard,
        });
      }
    }

    await Promise.all([
      playerGameplayService.setPlayerGameplay(
        userId,
        tableId,
        currentRound,
        playerGamePlay,
      ),
      tableGameplayService.setTableGameplay(
        tableId,
        currentRound,
        tableGameData,
      ),
      turnHistoryService.setTurnHistory(
        tableId,
        currentRound,
        currentRoundHistory,
      ),
      tableGameplayService.setOpenDiscardedCards(
        tableId,
        currentRound,
        openDiscardedCardsData,
      ),
    ]);

    await socketOperation.sendEventToClient(
      userProfileData.socketId,
      { ...eventResponse, ...eventResponseClientGrp },
      EVENTS.TIMEOUT_USER_TURN_CLIENT_SOCKET_EVENT,
    );

    await socketOperation.sendEventToRoom(
      tableId,
      EVENTS.TIMEOUT_USER_TURN_SOCKET_EVENT,
      { ...eventResponse }, // remove lastPickCard
    );

    if (playerGamePlay.timeoutCount >= zk.getConfig().MAX_TIMEOUT) {
      /**
       * lock release required here
       * as dropGame has used same lock so
       */
      try {
        playerGamePlay.gameEndReason =
          GAME_END_REASONS_INSTRUMENTATION.TIMEOUT_DROP;
        // check if socket is connected
        await playerGameplayService.setPlayerGameplay(
          userId,
          tableId,
          currentRound,
          playerGamePlay,
        );
        await redlock.Lock.release(lock);
        Logger.info(
          `Lock releasing, in onTurnExpire MAX TIMEOUT on resource:, ${lock.resource}`,
        );
        lock = undefined; // to avoid finally-catch error
      } catch (errInternal: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock onTurnExpire before dropGame: ${tableId}, ${errInternal}`,
          [errInternal],
        );
      }
      Logger.info(
        `DROPING USER FROM GAME COZ OF MAX TIMEOUT for table: ${tableId},
         user: ${userId}`,
      );
      await dropGame({ tableId }, { userId }, STRINGS.TURN_TIMEOUT);
    } else {
      await changeTurn(tableId);
    }
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR onTurnExpire found error for table ${
        turndata?.tableId || 'NOT FOUND'
      } `,
      [error],
    );
    if (error instanceof CancelBattleError) {
      await cancelBattle.cancelBattle(turndata.tableId, error);
    } else {
      throw new StateError(error.message);
    }
    // Error handle
  } finally {
    try {
      if (lock && lock instanceof Lock) {
        await redlock.Lock.release(lock);
        Logger.info(
          `Lock releasing, in onTurnExpire on resource:, ${lock.resource}`,
        );
      }
    } catch (err: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error While releasing lock on onTurnExpire: ${turndata?.tableId}, ${err}`,
      );
    }
  }
}
