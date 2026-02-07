"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const authMe = __importStar(require("../utils/ackMid"));
const newLogger_1 = require("../newLogger");
const events_1 = require("../state/events");
const uuid_1 = require("uuid");
const errors_1 = require("../constants/errors");
const events_2 = require("../constants/events");
const emoji_1 = __importDefault(require("../services/emoji"));
const dropGame_1 = require("../services/finishEvents/dropGame");
const finishGame_1 = require("../services/finishEvents/finishGame");
const cardHandler_1 = require("../services/gameplay/cardHandler");
const scoreCardAndScoreBoard_1 = require("../services/gameplay/scoreCardAndScoreBoard");
const handleOpenGamePopup_1 = require("../services/handleOpenGamePopup");
const joinBack_1 = require("../services/joinBack");
const leaveTable_1 = __importDefault(require("../services/leaveTable"));
const switchTable_1 = require("../services/leaveTable/switchTable");
const pickFromClosedDeck_1 = require("../services/moves/pickFromClosedDeck");
const pickFromOpenDeck_1 = require("../services/moves/pickFromOpenDeck");
const throwCard_1 = require("../services/moves/throwCard");
const rebuy_1 = __importDefault(require("../services/rebuy"));
const gameTableInfo_1 = __importDefault(require("../services/signUp/gameTableInfo"));
const split_1 = require("../services/split");
const userService_1 = require("../services/userService");
const errors_2 = require("../utils/errors");
const signUpHandler_1 = require("./signUpHandler");
function requestHandler([eventName, payload, ack], next) {
    return __awaiter(this, void 0, void 0, function* () {
        const that = this;
        const requestReceivedAt = `${new Date().getTime()}`;
        const socket = that;
        const requestUUID = (0, uuid_1.v4)();
        const { userId } = socket;
        const { data, metrics, networkParams, } = JSON.parse(payload);
        if (eventName !== 'HEART_BEAT')
            newLogger_1.Logger.info('EVENT_RECEIVED: ', [
                eventName,
                userId,
                payload,
                requestUUID,
                networkParams,
            ]);
        const { tableId } = data;
        try {
            if (tableId && !events_2.SAFE_STATE_EVENTS.includes(eventName)) {
                const eligibility = yield events_1.eventStateManager.isEligible(tableId, eventName);
                if (!eligibility.isEligible)
                    throw new errors_2.StateError(`Invalid event ${eventName} for table id ${tableId} in table state ${eligibility.state}`);
            }
            if (tableId && userId && (networkParams === null || networkParams === void 0 ? void 0 : networkParams.timeStamp)) {
                const eligibility = yield events_1.eventStateManager.isEligibleUser(tableId, userId, networkParams.timeStamp);
                if (!eligibility.isEligible)
                    throw new errors_2.StateError(`Invalid event ${eventName} for table id ${tableId}|${userId}
          in table state ${eligibility.state}|${eligibility.timestamp}`);
            }
            if (!userId) {
                throw new errors_2.StateError(`User id not set for table ${tableId} and event ${eventName}`);
            }
            let response;
            switch (eventName) {
                case events_2.EVENTS.HEART_BEAT_SOCKET_EVENT:
                    data.processedTime = new Date().toISOString();
                    authMe.ackMid(data, metrics, socket.userId, '', ack, requestReceivedAt, eventName);
                    break;
                case events_2.EVENTS.SIGN_UP:
                    response = yield (0, signUpHandler_1.signUpHandler)(data, socket, networkParams);
                    authMe.ackMid(response, metrics, socket.userId, response && 'tableId' in response ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.GROUP_CARDS:
                    response = yield cardHandler_1.cardHandler.groupCards(data, socket, networkParams);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.PICK_FROM_CLOSE_DECK_SOCKET_EVENT:
                    response = yield (0, pickFromClosedDeck_1.pickFromClosedDeck)(data, socket, networkParams, false);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.PICK_FROM_OPEN_DECK_SOCKET_EVENT:
                    response = yield (0, pickFromOpenDeck_1.pickFromOpenDeck)(data, socket, networkParams, false);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.DISCARD_CARD_SOCKET_EVENT:
                    response = yield (0, throwCard_1.throwCard)(data, socket, networkParams, false);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.DROP_SOCKET_EVENT: // Drop Cards
                    response = yield (0, dropGame_1.dropGame)(data, socket);
                    if (!response)
                        response = {};
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) || '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.OPEN_REBUY_POPUP:
                    response = yield rebuy_1.default.rebuyPopup(data, socket);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) || '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.REBUY_ACTION:
                    yield rebuy_1.default.rebuyTable(data, socket.userId);
                    break;
                case events_2.EVENTS.LEAVE_TABLE:
                    response = yield leaveTable_1.default.main(data, socket.userId, networkParams);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.ROUND_SCORE_CARD_SOCKET_EVENT:
                    response = yield (0, scoreCardAndScoreBoard_1.getLastRoundScoreCard)(data, socket);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.ROUND_SCORE_BOARD_SOCKET_EVENT:
                    response = yield (0, scoreCardAndScoreBoard_1.getLastRoundScoreBoard)(data, socket);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.DECLARE_CARD:
                    response = yield cardHandler_1.cardHandler.declareCard(data, socket, networkParams);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.FINISH_ROUND:
                    response = yield finishGame_1.finishGame.finishRound(data, socket, networkParams);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.OPEN_SPLIT_POPUP:
                    response = yield split_1.splitHandler.splitPopup(data, socket);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.SPLIT_ACCEPT_REJECT:
                    yield split_1.splitHandler.handleSplitAcceptReject(data, socket);
                    break;
                case events_2.EVENTS.SET_EMOJI:
                    yield emoji_1.default.send(socket.userId, data.tableId, data.emojiId);
                    break;
                case events_2.EVENTS.OPEN_GAME_POPUP_SOCKET_EVENT:
                    response = yield (0, handleOpenGamePopup_1.handleOpenGamePopup)(data, socket);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.GAME_INFO:
                    response = yield gameTableInfo_1.default.getTableInfo(data);
                    authMe.ackMid(response, metrics, socket.userId, data.tableId, ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.DISCARDED_CARDS:
                    response = yield cardHandler_1.cardHandler.discardedCards(data === null || data === void 0 ? void 0 : data.tableId);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.SWITCH_TABLE_SOCKET_EVENT:
                    response = yield (0, switchTable_1.switchTable)(data, socket);
                    if (ack)
                        authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.JOIN_BACK_SOCKET_EVENT:
                    response = yield (0, joinBack_1.joinBack)(data, socket, networkParams);
                    authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    break;
                case events_2.EVENTS.USER_BALANCE_SOCKET_EVENT:
                    response = yield userService_1.userService.getUserBalance(data === null || data === void 0 ? void 0 : data.userId, socket, socket.data.token, ack);
                    if (response) {
                        authMe.ackMid(response, metrics, socket.userId, (response === null || response === void 0 ? void 0 : response.tableId) ? response.tableId : '', ack, requestReceivedAt);
                    }
                    break;
            }
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at event handler`, [
                eventName,
                tableId,
                userId,
                payload,
                requestUUID,
                error
            ]);
            if (error instanceof errors_2.StateError) {
                const errorObj = {
                    errorMessage: errors_1.ERROR_CAUSES.STATE_ERROR,
                    errorCode: errors_1.ERROR_CODE.STATE_ERROR,
                    responseType: '',
                };
                const response = {
                    success: false,
                    error: errorObj,
                    tableId,
                };
                authMe.ackMid(response, metrics, socket.userId, response && 'tableId' in response ? response.tableId : '', ack, requestReceivedAt);
            }
            else {
                return { success: false, error };
            }
        }
        next();
    });
}
module.exports = requestHandler;
