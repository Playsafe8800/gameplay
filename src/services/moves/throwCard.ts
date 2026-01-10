import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import {
  PLAYER_STATE,
  TABLE_STATE,
  TURN_HISTORY,
} from '../../constants';
import { EVENTS, STATE_EVENTS } from '../../constants/events';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { turnHistoryService } from '../../db/turnHistory';
import { socketOperation } from '../../socketHandler/socketOperation';
import {
  issGroupingCardAndCurrentCardSame,
  removeEmptyString,
  removePickCardFromCards,
} from '../../utils';
import { cardUtils } from '../../utils/cards';
import { redlock } from '../../utils/lock/redlock';
import { validateThrowCardReq } from '../../validators/request.validator';
import {
  validateThrowCardAckRes,
  validateThrowCardRoomRes,
} from '../../validators/response.validator';
import { cardHandler } from '../gameplay/cardHandler';
import { changeTurn } from '../gameplay/turn';
import { scheduler } from '../schedulerQueue';
import {
  CancelBattleError,
  StateError,
} from '../../utils/errors/index';
import { cancelBattle } from '../gameplay/cancelBattle';
import { sortedCards } from '../../utils/turnHistory';
import { eventStateManager } from '../../state/events';
import { networkParams } from '../../objectModels/playerGameplay';

export async function throwCard(
  data: {
    tableId: string;
    card: string;
    group: Array<Array<string>>;
  },
  socket: any,
  networkParams: networkParams,
  isBot: boolean
) {
  let lock!: Lock;
  try {
    const { userId } = socket;
    const { tableId, card: discadedCard, group } = data;
    validateThrowCardReq(data);

    lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
    Logger.info(
      `Lock acquired, in throwCard resource:, ${lock.resource}`,
    );

    let isValid = true;
    let currentCardsGroup: Array<Array<string>> = group;

    const tableConfigurationData =
      await tableConfigurationService.getTableConfiguration(tableId, [
        'maximumPoints',
        'currentRound',
        'pileDiscardEnabled',
      ]);
    const { currentRound, pileDiscardEnabled } =
      tableConfigurationData;

    const [
      tableGamePlayData,
      playerGamePlayData,
      currentRoundHistory,
      openDiscardedCardsData,
    ]: Array<any> = await Promise.all([
      tableGameplayService.getTableGameplay(tableId, currentRound, [
        'trumpCard',
        'opendDeck',
        'tableState',
        'currentTurn',
      ]),
      playerGameplayService.getPlayerGameplay(
        userId,
        tableId,
        currentRound,
        ['userStatus', 'currentCards', 'groupingCards', 'rejectedCards'],
      ),
      turnHistoryService.getTurnHistory(tableId, currentRound),
      tableGameplayService.getOpenDiscardedCards(
        tableId,
        currentRound,
      ),
    ]);

    if (
      !(
        tableGamePlayData?.currentTurn === userId &&
        playerGamePlayData.currentCards.length === 14 &&
        playerGamePlayData.userStatus === PLAYER_STATE.PLAYING &&
        tableGamePlayData?.tableState === TABLE_STATE.ROUND_STARTED
      )
    ) {
      Logger.error(`INTERNAL_SERVER_ERROR current turn is not your turn! ${tableId}`, [
        tableGamePlayData,
        playerGamePlayData,
      ]);
      throw new Error('current turn is not your turn!');
    }

    // const currentRoundHistory: CurrentRoundTurnHistorySchema | any =
    //   getCurrentRoundHistory(turnHistory, currentRound);
    const lastestHistory =
      currentRoundHistory.turnsDetails[
      currentRoundHistory.turnsDetails.length - 1
      ];
    /**
     * Block dropping of picked card from open deck
     * for collusion prevention
     */
    // if (
    //   pileDiscardEnabled &&
    //   lastestHistory.cardPickSource === TURN_HISTORY.OPENED_DECK &&
    //   lastestHistory.cardPicked === discadedCard
    // ) {
    //   Logger.info(
    //     `INTERNAL_SERVER_ERROR Can't discard the card picked from open pile: ${tableId}`,
    //     [tableGamePlayData, playerGamePlayData],
    //   );
    //   throw new Error(`Can't discard the card picked from open pile`);
    // }

    // stop timer for player
    scheduler.cancelJob.playerTurnTimer(tableId, userId);

    if (
      !issGroupingCardAndCurrentCardSame(
        [...playerGamePlayData.currentCards],
        currentCardsGroup,
      )
    ) {
      isValid = false;
      currentCardsGroup = playerGamePlayData.groupingCards;
    }

    // add to opend deck
    tableGamePlayData.opendDeck.push(discadedCard);
    // remove from current card
    playerGamePlayData.currentCards = cardUtils.removeCardFromDeck(
      playerGamePlayData.currentCards,
      discadedCard,
    );
    currentCardsGroup = cardUtils.removePickCardFromGroupingCards(
      currentCardsGroup,
      discadedCard
    );
    playerGamePlayData.lastPickCard = discadedCard;

    if (!isBot) {
      if (!playerGamePlayData.rejectedCards) playerGamePlayData.rejectedCards = []
      playerGamePlayData.rejectedCards.push(discadedCard)
    } else {
      playerGamePlayData.turnCount = 1
    }

    const { score, meld, meldLabel } = cardHandler.groupCardsOnMeld(
      currentCardsGroup,
      tableGamePlayData.trumpCard,
      tableConfigurationData.maximumPoints,
    );
    playerGamePlayData.groupingCards = currentCardsGroup;
    playerGamePlayData.meld = meld;

    /**
     * update history
     */
    if (currentRoundHistory) {
      currentRoundHistory.turnsDetails[
        currentRoundHistory.turnsDetails.length - 1
      ].cardDiscarded = discadedCard;

      currentRoundHistory.turnsDetails[
        currentRoundHistory.turnsDetails.length - 1
      ].endState = removeEmptyString(
        playerGamePlayData.groupingCards.toString(),
      );

      currentRoundHistory.turnsDetails[
        currentRoundHistory.turnsDetails.length - 1
      ].sortedEndState = sortedCards(
        playerGamePlayData.groupingCards,
        playerGamePlayData.meld || [],
      );

      currentRoundHistory.turnsDetails[
        currentRoundHistory.turnsDetails.length - 1
      ].turnStatus = String(TURN_HISTORY.TURN).toUpperCase();

      currentRoundHistory.turnsDetails[
        currentRoundHistory.turnsDetails.length - 1
      ].points = score;
    }

    if (openDiscardedCardsData?.openCards) {
      const { openCards } = openDiscardedCardsData;
      openCards.push({
        userId,
        card: discadedCard,
      });
    }

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
      tableGameplayService.setOpenDiscardedCards(
        tableId,
        currentRound,
        openDiscardedCardsData,
      ),
    ]);

    const ackResponse = {
      tableId,
      score,
      meld: meldLabel,
      group: currentCardsGroup,
      isValid,
    };
    const tableResponse = {
      tableId,
      userId,
      card: discadedCard,
    };
    validateThrowCardAckRes(ackResponse);
    validateThrowCardRoomRes(tableResponse);

    socketOperation.sendEventToRoom(
      tableId,
      EVENTS.DISCARD_CARD_SOCKET_EVENT,
      tableResponse,
    );
    await eventStateManager.fireEvent(
      tableId,
      STATE_EVENTS.CARD_THROW,
    );
    await changeTurn(tableId);
    return ackResponse;
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR throwCard: ${socket?.userId}, ${error.message}`, [
      error,
    ]);
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
          `Lock releasing, in throwCard; resource:, ${lock.resource}`,
        );
      }
    } catch (err: any) {
      Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on throwCard: ${err}`);
    }
  }
}