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
exports.onTurnExpire = exports.changeTurn = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const connections_1 = require("../../connections");
const constants_1 = require("../../constants");
const events_1 = require("../../constants/events");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const turnHistory_1 = require("../../db/turnHistory");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const utils_1 = require("../../utils");
const errors_1 = require("../../utils/errors");
const index_1 = require("../../utils/errors/index");
const redlock_2 = require("../../utils/lock/redlock");
const suffleCard_1 = require("../../utils/suffleCard");
const turnHistory_2 = require("../../utils/turnHistory");
const dropGame_1 = require("../finishEvents/dropGame");
const cancelBattle_1 = require("./cancelBattle");
const cardHandler_1 = require("./cardHandler");
const round_1 = require("./round");
const gameEndReasons_1 = require("../../constants/gameEndReasons");
const helper_1 = require("../../mixpanel/helper");
/**
 * - throw card will call it automatically
 * - expire turn
 * - dropGame will call it if current turn player has droped game
 *
 * @param tableId
 */
const changeTurn = (tableId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tableData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
            'currentRound',
        ]);
        const { currentRound } = tableData;
        const tableGamePlay = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['currentTurn', 'seats']);
        if (!tableGamePlay) {
            throw Error('TableGamePlay not available!');
        }
        const playersGameData_1 = (yield Promise.all(tableGamePlay.seats.map((ele) => playerGameplay_1.playerGameplayService.getPlayerGameplay(ele._id, tableId, currentRound, [
            'userId',
            'userStatus',
            'isFirstTurn',
            'groupingCards',
            'timeoutCount',
            'currentCards',
            'meld',
        ])))).filter(Boolean);
        const playersGameData = [];
        playersGameData_1.forEach((pgp) => {
            if (pgp) {
                playersGameData.push(pgp);
            }
        });
        if (playersGameData.length === 0) {
            throw Error('No PlayerGamePlay available!');
        }
        newLogger_1.Logger.info(`changeTurn on ${tableId} , Round ${currentRound} with TGP: `, [playersGameData.map((pgp) => pgp === null || pgp === void 0 ? void 0 : pgp.userId), tableGamePlay]);
        const nextTurn = round_1.round.getNextPlayer(tableGamePlay.currentTurn, playersGameData);
        newLogger_1.Logger.info(`turn changed, current turn user ${nextTurn} for table ${tableId}`);
        yield round_1.round.startUserTurn(tableId, currentRound, nextTurn, playersGameData);
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR changeTurn found error for table ${tableId} `, [
            error,
        ]);
        if (error instanceof index_1.CancelBattleError) {
            yield cancelBattle_1.cancelBattle.cancelBattle(tableId, error);
        }
        else {
            throw new errors_1.StateError(error.message);
        }
    }
});
exports.changeTurn = changeTurn;
// scheduler initiated function
function onTurnExpire(turndata) {
    return __awaiter(this, void 0, void 0, function* () {
        newLogger_1.Logger.info('Starting onTurnExpire ', [turndata]);
        let lock;
        try {
            if (!turndata || !turndata.tableId || !turndata.userId) {
                throw new Error(`onTurnExpire:>> Error: tableId/userId not found`);
            }
            const { tableId, userId } = turndata;
            lock = yield redlock_2.redlock.Lock.acquire([`lock:${turndata.tableId}`], 2000);
            newLogger_1.Logger.info(`Lock acquired onTurnExpire on resource:, ${lock.resource} `);
            const tableConfig = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
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
            const promiseList = yield Promise.all([
                tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                    'opendDeck',
                    'closedDeck',
                    'trumpCard',
                    'papluCard',
                    'currentTurn',
                ]),
                playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, [
                    'userId',
                    'currentCards',
                    'groupingCards',
                    'meld',
                    'isFirstTurn',
                    'userStatus',
                    'timeoutCount',
                ]),
                turnHistory_1.turnHistoryService.getTurnHistory(tableId, currentRound),
                tableGameplay_1.tableGameplayService.getOpenDiscardedCards(tableId, currentRound),
            ]);
            const userProfileData = yield userProfile_1.userProfileService.getOrCreateUserDetailsById(userId);
            const [tableGameData, playerGamePlay, currentRoundHistory] = promiseList;
            let [, , , openDiscardedCardsData] = promiseList;
            newLogger_1.Logger.info('onTurnExpire: TGP, PGP', [
                tableConfig,
                tableGameData,
                playerGamePlay,
                turndata.tableId
            ]);
            if (!((tableGameData === null || tableGameData === void 0 ? void 0 : tableGameData.currentTurn) === userId &&
                (playerGamePlay === null || playerGamePlay === void 0 ? void 0 : playerGamePlay.userStatus) === constants_1.PLAYER_STATE.PLAYING)) {
                const err = `On Table ${tableId}: current turn in table does not match with the turn expire user; 
      tableGameData.currentTurn is ${tableGameData === null || tableGameData === void 0 ? void 0 : tableGameData.currentTurn},
      user is: ${userId};\n
      "User status": ${playerGamePlay === null || playerGamePlay === void 0 ? void 0 : playerGamePlay.userStatus}`;
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR`, [err]);
                if (!tableGameData || !(tableGameData === null || tableGameData === void 0 ? void 0 : tableGameData.currentTurn)) {
                    throw new errors_1.CacheDataMismatchFound(err);
                }
                throw new errors_1.TurnMismatchError(err);
            }
            if (!(openDiscardedCardsData === null || openDiscardedCardsData === void 0 ? void 0 : openDiscardedCardsData.openCards)) {
                openDiscardedCardsData = {
                    openCards: [],
                };
            }
            if (playerGamePlay.isFirstTurn) {
                playerGamePlay.isFirstTurn = false;
                (0, helper_1.sendDropMixpanel)(currencyType, gameId, maximumPoints, bootValue, userId, tableId, currentRound, maximumSeat, userProfileData.isBot, false, true);
            }
            const turnObject = currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1];
            let lastPickCard = '';
            let groupCards = playerGamePlay.groupingCards;
            if (playerGamePlay.currentCards.length > 13) {
                // PGP- update currentCards, groupingCards,lastPickCard, set tCount =0
                lastPickCard = playerGamePlay.currentCards.pop() || '';
                groupCards = (0, utils_1.removePickCardFromCards)(lastPickCard, playerGamePlay.groupingCards);
                playerGamePlay.lastPickCard = lastPickCard;
                // update tableGameData
                tableGameData.opendDeck.push(lastPickCard);
                turnObject.cardDiscarded = lastPickCard;
                if (openDiscardedCardsData === null || openDiscardedCardsData === void 0 ? void 0 : openDiscardedCardsData.openCards) {
                    const { openCards } = openDiscardedCardsData;
                    openCards.push({
                        userId,
                        card: lastPickCard,
                    });
                }
            }
            const { score, meld, meldLabel } = cardHandler_1.cardHandler.groupCardsOnMeld(groupCards, tableGameData.trumpCard, tableConfig.maximumPoints, tableGameData.papluCard);
            playerGamePlay.groupingCards = groupCards;
            playerGamePlay.meld = meld;
            playerGamePlay.timeoutCount += 1;
            turnObject.turnStatus = constants_1.TURN_HISTORY.TIMEOUT;
            turnObject.endState = (0, utils_1.removeEmptyString)(playerGamePlay.currentCards.toString());
            turnObject.sortedEndState = (0, turnHistory_2.sortedCards)(playerGamePlay.groupingCards, playerGamePlay.meld); // Needed it or not, to verify
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
            newLogger_1.Logger.info('on Turn Expire', [
                playerGamePlay.currentCards,
                tableConfig,
                turnObject,
                lastPickCard,
                eventResponse,
            ]);
            if (tableConfig.pileDiscardEnabled &&
                (turnObject.cardPickSource === constants_1.TURN_HISTORY.OPENED_DECK ||
                    !lastPickCard)) {
                let lastCardOpendeck;
                if (tableGameData.closedDeck.length === 0) {
                    lastCardOpendeck = tableGameData.opendDeck.pop() || '';
                    tableGameData.closedDeck = (0, suffleCard_1.shuffleCards)(tableGameData.opendDeck);
                    tableGameData.opendDeck = [lastCardOpendeck];
                }
                const closedDeckCard = tableGameData.closedDeck.pop();
                if (closedDeckCard)
                    tableGameData.opendDeck.push(closedDeckCard);
                Object.assign(eventResponse, {
                    openDeckCardToShow: closedDeckCard,
                    toastMsg: `${userProfileData.userName} Timeout. \nDiscarding the top card from closed deck to continue`,
                });
                if ((openDiscardedCardsData === null || openDiscardedCardsData === void 0 ? void 0 : openDiscardedCardsData.openCards) && closedDeckCard) {
                    const { openCards } = openDiscardedCardsData;
                    openCards.push({
                        userId: 0,
                        card: closedDeckCard,
                    });
                }
            }
            yield Promise.all([
                playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlay),
                tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameData),
                turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory),
                tableGameplay_1.tableGameplayService.setOpenDiscardedCards(tableId, currentRound, openDiscardedCardsData),
            ]);
            yield socketOperation_1.socketOperation.sendEventToClient(userProfileData.socketId, Object.assign(Object.assign({}, eventResponse), eventResponseClientGrp), events_1.EVENTS.TIMEOUT_USER_TURN_CLIENT_SOCKET_EVENT);
            yield socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.TIMEOUT_USER_TURN_SOCKET_EVENT, Object.assign({}, eventResponse));
            if (playerGamePlay.timeoutCount >= connections_1.zk.getConfig().MAX_TIMEOUT) {
                /**
                 * lock release required here
                 * as dropGame has used same lock so
                 */
                try {
                    playerGamePlay.gameEndReason =
                        gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.TIMEOUT_DROP;
                    // check if socket is connected
                    yield playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlay);
                    yield redlock_2.redlock.Lock.release(lock);
                    newLogger_1.Logger.info(`Lock releasing, in onTurnExpire MAX TIMEOUT on resource:, ${lock.resource}`);
                    lock = undefined; // to avoid finally-catch error
                }
                catch (errInternal) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock onTurnExpire before dropGame: ${tableId}, ${errInternal}`, [errInternal]);
                }
                newLogger_1.Logger.info(`DROPING USER FROM GAME COZ OF MAX TIMEOUT for table: ${tableId},
         user: ${userId}`);
                yield (0, dropGame_1.dropGame)({ tableId }, { userId }, constants_1.STRINGS.TURN_TIMEOUT);
            }
            else {
                yield (0, exports.changeTurn)(tableId);
            }
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR onTurnExpire found error for table ${(turndata === null || turndata === void 0 ? void 0 : turndata.tableId) || 'NOT FOUND'} `, [error]);
            if (error instanceof index_1.CancelBattleError) {
                yield cancelBattle_1.cancelBattle.cancelBattle(turndata.tableId, error);
            }
            else {
                throw new errors_1.StateError(error.message);
            }
            // Error handle
        }
        finally {
            try {
                if (lock && lock instanceof redlock_1.Lock) {
                    yield redlock_2.redlock.Lock.release(lock);
                    newLogger_1.Logger.info(`Lock releasing, in onTurnExpire on resource:, ${lock.resource}`);
                }
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on onTurnExpire: ${turndata === null || turndata === void 0 ? void 0 : turndata.tableId}, ${err}`);
            }
        }
    });
}
exports.onTurnExpire = onTurnExpire;
