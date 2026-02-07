"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwCard = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const constants_1 = require("../../constants");
const events_1 = require("../../constants/events");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const turnHistory_1 = require("../../db/turnHistory");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const utils_1 = require("../../utils");
const cards_1 = require("../../utils/cards");
const redlock_2 = require("../../utils/lock/redlock");
const request_validator_1 = require("../../validators/request.validator");
const response_validator_1 = require("../../validators/response.validator");
const cardHandler_1 = require("../gameplay/cardHandler");
const turn_1 = require("../gameplay/turn");
const schedulerQueue_1 = require("../schedulerQueue");
const index_1 = require("../../utils/errors/index");
const cancelBattle_1 = require("../gameplay/cancelBattle");
const turnHistory_2 = require("../../utils/turnHistory");
const events_2 = require("../../state/events");
function throwCard(data, socket, networkParams, isBot) {
    return __awaiter(this, void 0, void 0, function* () {
        let lock;
        try {
            const { userId } = socket;
            const { tableId, card: discadedCard, group } = data;
            (0, request_validator_1.validateThrowCardReq)(data);
            lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 2000);
            newLogger_1.Logger.info(`Lock acquired, in throwCard resource:, ${lock.resource}`);
            let isValid = true;
            let currentCardsGroup = group;
            const tableConfigurationData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                'maximumPoints',
                'currentRound',
                'pileDiscardEnabled',
            ]);
            const { currentRound, pileDiscardEnabled } = tableConfigurationData;
            const [tableGamePlayData, playerGamePlayData, currentRoundHistory, openDiscardedCardsData,] = yield Promise.all([
                tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                    'trumpCard',
                    'opendDeck',
                    'tableState',
                    'currentTurn',
                ]),
                playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, ['userStatus', 'currentCards', 'groupingCards', 'rejectedCards']),
                turnHistory_1.turnHistoryService.getTurnHistory(tableId, currentRound),
                tableGameplay_1.tableGameplayService.getOpenDiscardedCards(tableId, currentRound),
            ]);
            if (!((tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.currentTurn) === userId &&
                playerGamePlayData.currentCards.length === 14 &&
                playerGamePlayData.userStatus === constants_1.PLAYER_STATE.PLAYING &&
                (tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.tableState) === constants_1.TABLE_STATE.ROUND_STARTED)) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR current turn is not your turn! ${tableId}`, [
                    tableGamePlayData,
                    playerGamePlayData,
                ]);
                throw new Error('current turn is not your turn!');
            }
            // const currentRoundHistory: CurrentRoundTurnHistorySchema | any =
            //   getCurrentRoundHistory(turnHistory, currentRound);
            const lastestHistory = currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1];
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
            schedulerQueue_1.scheduler.cancelJob.playerTurnTimer(tableId, userId);
            if (!(0, utils_1.issGroupingCardAndCurrentCardSame)([...playerGamePlayData.currentCards], currentCardsGroup)) {
                isValid = false;
                currentCardsGroup = playerGamePlayData.groupingCards;
            }
            // add to opend deck
            tableGamePlayData.opendDeck.push(discadedCard);
            // remove from current card
            playerGamePlayData.currentCards = cards_1.cardUtils.removeCardFromDeck(playerGamePlayData.currentCards, discadedCard);
            currentCardsGroup = cards_1.cardUtils.removePickCardFromGroupingCards(currentCardsGroup, discadedCard);
            playerGamePlayData.lastPickCard = discadedCard;
            if (!isBot) {
                if (!playerGamePlayData.rejectedCards)
                    playerGamePlayData.rejectedCards = [];
                playerGamePlayData.rejectedCards.push(discadedCard);
            }
            else {
                playerGamePlayData.turnCount = 1;
            }
            const { score, meld, meldLabel } = cardHandler_1.cardHandler.groupCardsOnMeld(currentCardsGroup, tableGamePlayData.trumpCard, tableConfigurationData.maximumPoints);
            playerGamePlayData.groupingCards = currentCardsGroup;
            playerGamePlayData.meld = meld;
            /**
             * update history
             */
            if (currentRoundHistory) {
                currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].cardDiscarded = discadedCard;
                currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].endState = (0, utils_1.removeEmptyString)(playerGamePlayData.groupingCards.toString());
                currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].sortedEndState = (0, turnHistory_2.sortedCards)(playerGamePlayData.groupingCards, playerGamePlayData.meld || []);
                currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].turnStatus = String(constants_1.TURN_HISTORY.TURN).toUpperCase();
                currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].points = score;
            }
            if (openDiscardedCardsData === null || openDiscardedCardsData === void 0 ? void 0 : openDiscardedCardsData.openCards) {
                const { openCards } = openDiscardedCardsData;
                openCards.push({
                    userId,
                    card: discadedCard,
                });
            }
            if (networkParams) {
                playerGamePlayData.networkParams = networkParams;
            }
            yield Promise.all([
                tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGamePlayData),
                playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlayData),
                turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory),
                tableGameplay_1.tableGameplayService.setOpenDiscardedCards(tableId, currentRound, openDiscardedCardsData),
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
            (0, response_validator_1.validateThrowCardAckRes)(ackResponse);
            (0, response_validator_1.validateThrowCardRoomRes)(tableResponse);
            socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.DISCARD_CARD_SOCKET_EVENT, tableResponse);
            yield events_2.eventStateManager.fireEvent(tableId, events_1.STATE_EVENTS.CARD_THROW);
            yield (0, turn_1.changeTurn)(tableId);
            return ackResponse;
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR throwCard: ${socket === null || socket === void 0 ? void 0 : socket.userId}, ${error.message}`, [
                error,
            ]);
            if (error instanceof index_1.CancelBattleError) {
                yield cancelBattle_1.cancelBattle.cancelBattle(data.tableId, error);
            }
            else {
                throw new index_1.StateError(error.message);
            }
        }
        finally {
            try {
                if (lock && lock instanceof redlock_1.Lock) {
                    yield redlock_2.redlock.Lock.release(lock);
                    newLogger_1.Logger.info(`Lock releasing, in throwCard; resource:, ${lock.resource}`);
                }
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on throwCard: ${err}`);
            }
        }
    });
}
exports.throwCard = throwCard;
