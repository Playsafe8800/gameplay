"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDropMixpanel = void 0;
const constants_1 = require("../constants");
const index_1 = __importDefault(require("./index"));
const sendDropMixpanel = (currencyType, gameId, maximumPoints, bootValue, userId, tableId, currentRound, maximumSeat, isBot, isDrop, timeout) => {
    let isFree = currencyType === constants_1.CURRENCY_TYPE.COINS;
    let gameTitle = '';
    if (gameId === 1) {
        gameTitle = `${maximumPoints} POOL`;
    }
    else if (gameId === 2) {
        gameTitle = isFree ? `POINTS` : `${bootValue} /POINT`;
    }
    else {
        gameTitle = isFree ? `DEALS` : `2 DEALS`;
    }
    let dataObj = {
        userId,
        event: 'drop',
        tableId,
        round: currentRound,
        gameFormat: gameTitle,
        maxPlayers: maximumSeat,
        entryAmount: bootValue,
        isBot: isBot,
        Drop: isDrop,
        timeout,
    };
    (0, index_1.default)('BE_bot_drop', dataObj);
};
exports.sendDropMixpanel = sendDropMixpanel;
