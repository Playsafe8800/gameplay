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
exports.pickFromOpenDeck = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const constants_1 = require("../../constants");
const events_1 = require("../../constants/events");
const playerState_1 = require("../../constants/playerState");
const tableState_1 = require("../../constants/tableState");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const userProfile_1 = require("../../db/userProfile");
const turnHistory_1 = require("../../db/turnHistory");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const redlock_2 = require("../../utils/lock/redlock");
const request_validator_1 = require("../../validators/request.validator");
const response_validator_1 = require("../../validators/response.validator");
const index_1 = require("../../utils/errors/index");
const cancelBattle_1 = require("../gameplay/cancelBattle");
const events_2 = require("../../state/events");
const helper_1 = require("../../mixpanel/helper");
const pickFromOpenDeck = (data, socket, networkParams, isBot) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let lock;
    try {
        const { userId } = socket;
        const { tableId } = data;
        (0, request_validator_1.validatePickCardReq)(data);
        lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 2000);
        newLogger_1.Logger.info(`Lock acquired, in pickFromOpenDeck resource:, ${lock.resource}`);
        const tableConfigurationData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
            'currentRound',
            'gameId',
            'maximumSeat',
            'maximumPoints',
            "currencyType",
            "bootValue"
        ]);
        const { currentRound, gameId, maximumPoints, currencyType, bootValue, maximumSeat } = tableConfigurationData;
        const [tableGamePlayData, playerGamePlayData, currentRoundHistory] = yield Promise.all([
            tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                'opendDeck',
                'tableState',
                'currentTurn',
            ]),
            playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, [
                'userStatus',
                'currentCards',
                'isFirstTurn',
                'groupingCards',
                'pickedCards'
            ]),
            turnHistory_1.turnHistoryService.getTurnHistory(tableId, currentRound)
        ]);
        if (!((tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.currentTurn) === userId &&
            ((_a = playerGamePlayData === null || playerGamePlayData === void 0 ? void 0 : playerGamePlayData.currentCards) === null || _a === void 0 ? void 0 : _a.length) === 13 &&
            (playerGamePlayData === null || playerGamePlayData === void 0 ? void 0 : playerGamePlayData.userStatus) === playerState_1.PLAYER_STATE.PLAYING &&
            (tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.tableState) === tableState_1.TABLE_STATE.ROUND_STARTED)) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR current turn is not your turn! ${tableId}`, [
                tableGamePlayData,
                playerGamePlayData,
            ]);
            throw new Error('current turn is not your turn!');
        }
        const userProfileData = yield userProfile_1.userProfileService.getOrCreateUserDetailsById(userId);
        // pick from open deck
        const lastPickCard = tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.opendDeck.pop();
        // add to current card
        playerGamePlayData.currentCards.push(lastPickCard);
        if (playerGamePlayData.isFirstTurn) {
            playerGamePlayData.isFirstTurn = false;
            (0, helper_1.sendDropMixpanel)(currencyType, gameId, maximumPoints, bootValue, userId, tableId, currentRound, maximumSeat, userProfileData.isBot, false, false);
        }
        if ((_b = playerGamePlayData.groupingCards) === null || _b === void 0 ? void 0 : _b.length) {
            playerGamePlayData.groupingCards[playerGamePlayData.groupingCards.length - 1].push(lastPickCard);
        }
        else if (playerGamePlayData.groupingCards) {
            playerGamePlayData.groupingCards.push([lastPickCard]);
        }
        if (!isBot) {
            if (!playerGamePlayData.pickedCards)
                playerGamePlayData.pickedCards = [];
            playerGamePlayData.pickedCards.push(lastPickCard);
        }
        /**
         * update turn history
         */
        // const currentRoundHistory: CurrentRoundTurnHistorySchema | any =
        //   await getCurrentRoundHistory(turnHistory, currentRound);
        if (currentRoundHistory) {
            currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].cardPickSource = constants_1.TURN_HISTORY.OPENED_DECK;
            currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].cardPicked = lastPickCard;
        }
        // resetting timeout
        playerGamePlayData.timeoutCount = 0;
        if (networkParams) {
            playerGamePlayData.networkParams = networkParams;
        }
        yield Promise.all([
            tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGamePlayData),
            playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlayData),
            turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory),
            events_2.eventStateManager.fireEvent(tableId, events_1.STATE_EVENTS.CARD_PICKED),
        ]);
        const ackResponse = {
            tableId,
            card: lastPickCard,
        };
        const tableResponse = {
            userId,
            tableId,
        };
        (0, response_validator_1.validatePickCardAckRes)(ackResponse);
        (0, response_validator_1.validatePickCardRoomRes)(tableResponse);
        socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.PICK_FROM_OPEN_DECK_SOCKET_EVENT, tableResponse);
        return ackResponse;
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR pickFromOpenDeck: ${socket === null || socket === void 0 ? void 0 : socket.userId}, ${error.message}`, [error]);
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
                newLogger_1.Logger.info(`Lock releasing, in pickFromOpenDeck; resource:, ${lock.resource}`);
            }
        }
        catch (err) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on pickFromOpenDeck: ${err}`);
        }
    }
});
exports.pickFromOpenDeck = pickFromOpenDeck;
