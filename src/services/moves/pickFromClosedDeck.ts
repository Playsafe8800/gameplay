import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import { TURN_HISTORY } from '../../constants';
import { EVENTS, STATE_EVENTS } from '../../constants/events';
import { PLAYER_STATE } from '../../constants/playerState';
import { TABLE_STATE } from '../../constants/tableState';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { turnHistoryService } from '../../db/turnHistory';
import { networkParams } from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import { redlock } from '../../utils/lock/redlock';
import { shuffleCards } from '../../utils/suffleCard';
import { validatePickCardReq } from '../../validators/request.validator';
import {
  validatePickCardAckRes,
  validatePickCardRoomRes,
} from '../../validators/response.validator';
import {
  CancelBattleError,
  StateError,
} from '../../utils/errors/index';
import { cancelBattle } from '../gameplay/cancelBattle';
import { eventStateManager } from '../../state/events';
import { sendDropMixpanel } from '../../mixpanel/helper';
import { userProfileService } from '../../db/userProfile';

export const pickFromClosedDeck = async (
  data: { tableId: string },
  socket: any,
  networkParams: networkParams,
  isBot: boolean
) => {
  let lock!: Lock;
  try {
    const { userId } = socket;
    const { tableId } = data;
    validatePickCardReq(data);

    lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
    Logger.info(
      `Lock acquired, in pickFromClosedDeck ${userId} ${tableId} resource:, ${lock.resource}`,
    );

    const tableConfigurationData: any =
      await tableConfigurationService.getTableConfiguration(tableId, [
        'currentRound',
        'gameId',
        'maximumSeat',
        'maximumPoints',
        "currencyType",
        "bootValue"
      ]);
    const { currentRound , gameId, maximumPoints, currencyType, bootValue, maximumSeat} = tableConfigurationData;

    const [
      tableGamePlayData,
      playerGamePlayData,
      currentRoundHistory,
    ]: Array<any> = await Promise.all([
      tableGameplayService.getTableGameplay(tableId, currentRound, [
        'currentTurn',
        'tableState',
        'closedDeck',
        'opendDeck',
      ]),
      playerGameplayService.getPlayerGameplay(
        userId,
        tableId,
        currentRound,
        [
          'userStatus',
          'isFirstTurn',
          'currentCards',
          'groupingCards',
          'rejectedCards'
        ],
      ),
      turnHistoryService.getTurnHistory(tableId, currentRound),
    ]);

    if (
      !(
        tableGamePlayData?.currentTurn === userId &&
        playerGamePlayData?.currentCards?.length === 13 &&
        playerGamePlayData?.userStatus === PLAYER_STATE.PLAYING &&
        tableGamePlayData?.tableState === TABLE_STATE.ROUND_STARTED
      )
    ) {
      Logger.error(`INTERNAL_SERVER_ERROR current turn is not your turn! ${tableId}`, [
        tableGamePlayData,
        playerGamePlayData,
      ]);
      throw new Error('current turn is not your turn!');
    }
    const userProfileData =
      await userProfileService.getOrCreateUserDetailsById(userId);

    let lastCardOpendeck;
    let isDeckShuffle = false;
    if (tableGamePlayData?.closedDeck?.length === 0) {
      lastCardOpendeck = tableGamePlayData.opendDeck.pop();
      tableGamePlayData.closedDeck = shuffleCards(
        tableGamePlayData.opendDeck,
      );
      tableGamePlayData.opendDeck = [lastCardOpendeck];
      isDeckShuffle = true;
    }
    // pick from closed deck
    const lastPickCard = tableGamePlayData?.closedDeck.shift();
    // add to current card
    playerGamePlayData.currentCards.push(lastPickCard);
    if (playerGamePlayData.isFirstTurn) {
      playerGamePlayData.isFirstTurn = false;
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
        false
      );
    }

    if (playerGamePlayData.groupingCards?.length) {
      playerGamePlayData.groupingCards[
        playerGamePlayData.groupingCards.length - 1
      ].push(lastPickCard);
    } else if (playerGamePlayData.groupingCards) {
      playerGamePlayData.groupingCards.push([lastPickCard]);
    }
    if (!isBot) {
      const lastPickCard = tableGamePlayData?.opendDeck[tableGamePlayData?.opendDeck.length - 1];
      if (!playerGamePlayData.rejectedCards) playerGamePlayData.rejectedCards = []
      playerGamePlayData.rejectedCards.push(lastPickCard)
    }
    /**
     * update turn history
     */
    // const currentRoundHistory: CurrentRoundTurnHistorySchema | any =
    //   await getCurrentRoundHistory(turnHistory, currentRound);
    if (currentRoundHistory) {
      currentRoundHistory.turnsDetails[
        currentRoundHistory.turnsDetails.length - 1
      ].cardPickSource = TURN_HISTORY.CLOSED_DECK;

      currentRoundHistory.turnsDetails[
        currentRoundHistory.turnsDetails.length - 1
      ].cardPicked = lastPickCard;
    }
    if (networkParams) {
      playerGamePlayData.networkParams = networkParams;
    }
    // resetting timeout
    playerGamePlayData.timeoutCount = 0;
    await Promise.all([
      tableGameplayService.setTableGameplay(
        tableId,
        currentRound,
        tableGamePlayData,
      ),
      playerGameplayService.setPlayerGameplay(
        userId,
        tableId,
        currentRound,
        playerGamePlayData,
      ),
      turnHistoryService.setTurnHistory(
        tableId,
        currentRound,
        currentRoundHistory,
      ),
      eventStateManager.fireEvent(tableId, STATE_EVENTS.CARD_PICKED),
    ]);

    const ackResponse = {
      tableId,
      card: lastPickCard,
    };
    const tableResponse = {
      userId,
      tableId,
    };
    validatePickCardAckRes(ackResponse);
    validatePickCardRoomRes(tableResponse);

    socketOperation.sendEventToRoom(
      tableId,
      EVENTS.PICK_FROM_CLOSE_DECK_SOCKET_EVENT,
      tableResponse,
    );

    if (isDeckShuffle) {
      Logger.info(`closed deck is shuffled.. for ${tableId}`, [
        playerGamePlayData,
        tableGamePlayData,
      ]);
      socketOperation.sendEventToRoom(
        tableId,
        EVENTS.CLOSED_DECK_SUFFLE_SOCKET_EVENT,
      );
    }
    return ackResponse;
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR pickFromClosedDeck: ${socket?.userId}, ${error.message}`,
      [error],
    );
    if (error instanceof CancelBattleError) {
      await cancelBattle.cancelBattle(data.tableId, error);
    } else {
      throw new StateError(error.message);
    }
  } finally {
    try {
      if (lock && lock instanceof Lock) {
        await redlock.Lock.release(lock);
        Logger.info(
          `Lock releasing, in pickFromClosedDeck; resource:, ${lock.resource}`,
        );
      }
    } catch (err: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error While releasing lock on pickFromClosedDeck: ${err}`,
      );
    }
  }
};
