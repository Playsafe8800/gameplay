import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import { TURN_HISTORY } from '../../constants';
import { EVENTS, STATE_EVENTS } from '../../constants/events';
import { PLAYER_STATE } from '../../constants/playerState';
import { TABLE_STATE } from '../../constants/tableState';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { userProfileService } from '../../db/userProfile';

import { turnHistoryService } from '../../db/turnHistory';
import { socketOperation } from '../../socketHandler/socketOperation';
import { redlock } from '../../utils/lock/redlock';
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
import { networkParams } from '../../objectModels/playerGameplay';
import { sendDropMixpanel } from '../../mixpanel/helper';

export const pickFromOpenDeck = async (
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
      `Lock acquired, in pickFromOpenDeck resource:, ${lock.resource}`,
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
    const { currentRound, gameId, maximumPoints, currencyType, bootValue, maximumSeat } = tableConfigurationData;

    const [
      tableGamePlayData,
      playerGamePlayData,
      currentRoundHistory
    ]: Array<any> = await Promise.all([
      tableGameplayService.getTableGameplay(tableId, currentRound, [
        'opendDeck',
        'tableState',
        'currentTurn',
      ]),
      playerGameplayService.getPlayerGameplay(
        userId,
        tableId,
        currentRound,
        [
          'userStatus',
          'currentCards',
          'isFirstTurn',
          'groupingCards',
          'pickedCards'
        ],
      ),
      turnHistoryService.getTurnHistory(tableId, currentRound)
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

    // pick from open deck
    const lastPickCard = tableGamePlayData?.opendDeck.pop();
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
      if (!playerGamePlayData.pickedCards) playerGamePlayData.pickedCards = []
      playerGamePlayData.pickedCards.push(lastPickCard)
    }
    /**
     * update turn history
     */
    // const currentRoundHistory: CurrentRoundTurnHistorySchema | any =
    //   await getCurrentRoundHistory(turnHistory, currentRound);
    if (currentRoundHistory) {
      currentRoundHistory.turnsDetails[
        currentRoundHistory.turnsDetails.length - 1
      ].cardPickSource = TURN_HISTORY.OPENED_DECK;

      currentRoundHistory.turnsDetails[
        currentRoundHistory.turnsDetails.length - 1
      ].cardPicked = lastPickCard;
    }
    // resetting timeout
    playerGamePlayData.timeoutCount = 0;
    if (networkParams) {
      playerGamePlayData.networkParams = networkParams;
    }

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
      EVENTS.PICK_FROM_OPEN_DECK_SOCKET_EVENT,
      tableResponse,
    );

    return ackResponse;
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR pickFromOpenDeck: ${socket?.userId}, ${error.message}`,
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
          `Lock releasing, in pickFromOpenDeck; resource:, ${lock.resource}`,
        );
      }
    } catch (err: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error While releasing lock on pickFromOpenDeck: ${err}`,
      );
    }
  }
};
