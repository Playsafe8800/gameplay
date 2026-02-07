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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBot = exports.getRoundEndReason = exports.setUserCash = exports.updateUserCash = exports.sendAutoDebitInfo = exports.formatGameDetails = exports.isPointsRummyFormat = exports.removeEmptyString = exports.getWinnings = exports.getBootValue = exports.getFormatV2 = exports.getFormat = exports.isGameTie = exports.getDropStatus = exports.getDropPoints = exports.issGroupingCardAndCurrentCardSame = exports.removePickCardFromCards = exports.removePickCardFromGroupingCards = exports.getRandomTableId = exports.flattenObject = exports.roundInt = exports.getGameId = exports.getIdPrefix = exports.deductScoreForDeals = exports.setFinishDataForPlayers = exports.rankSortComparator = exports.getMaxRejoinPoints = void 0;
const newLogger_1 = require("../newLogger");
const underscore_1 = __importDefault(require("underscore"));
const uuid_1 = require("uuid");
const connections_1 = require("../connections");
const constants_1 = require("../constants");
const tableState_1 = require("../constants/tableState");
const playerGameplay_1 = require("../db/playerGameplay");
const userProfile_1 = require("../db/userProfile");
const userService_1 = require("../services/userService");
const socketOperation_1 = require("../socketHandler/socketOperation");
const gameEndReasons_1 = require("../constants/gameEndReasons");
const userService_2 = __importDefault(require("../userService"));
function getMaxRejoinPoints(tableConfigData) {
    const { TABLE_MAX_REJOINABLE_POINTS_101, TABLE_MAX_REJOINABLE_POINTS_201, TABLE_MAX_REJOINABLE_POINTS_61, } = connections_1.zk.getConfig();
    const { maximumPoints } = tableConfigData;
    switch (maximumPoints) {
        case 201:
            return TABLE_MAX_REJOINABLE_POINTS_201;
        case 101:
            return TABLE_MAX_REJOINABLE_POINTS_101;
        case 61:
            return TABLE_MAX_REJOINABLE_POINTS_61;
    }
}
exports.getMaxRejoinPoints = getMaxRejoinPoints;
const rankSortComparator = (a, b) => {
    const comp = b.dealPoint - a.dealPoint;
    if (comp === 0) {
        return a.points - b.points;
    }
    return comp;
};
exports.rankSortComparator = rankSortComparator;
function setFinishDataForPlayers(players, finishGrpc) {
    const updatedPlayersList = players.map((currentPlayerData) => {
        const finishPlayerData = finishGrpc.playersData.find((finishPlayer) => finishPlayer.userId === currentPlayerData.userId);
        return Object.assign(Object.assign({}, currentPlayerData), { canPlayAgain: finishPlayerData.canPlayAgain, interventionPayload: finishPlayerData.interventionPayload, canPlayAgainFailureReason: finishPlayerData.canPlayAgainFailureReason });
    });
    return updatedPlayersList;
}
exports.setFinishDataForPlayers = setFinishDataForPlayers;
function deductScoreForDeals(playerData, tableGamePlayData, points) {
    playerData.dealPoint -= points;
    playerData.points = points;
    tableGamePlayData.pointsForRoundWinner += points;
    if (playerData.dealPoint < 0)
        playerData.dealPoint = 0;
}
exports.deductScoreForDeals = deductScoreForDeals;
function getIdPrefix(GAME_TYPE = constants_1.RUMMY_TYPES.POOL) {
    switch (GAME_TYPE) {
        case constants_1.RUMMY_TYPES.POOL:
            return constants_1.STRINGS.RPOM;
        case constants_1.RUMMY_TYPES.DEALS:
            return constants_1.STRINGS.RNDM;
        case constants_1.RUMMY_TYPES.POINTS:
            return constants_1.STRINGS.RNPM;
        default:
            return undefined;
    }
}
exports.getIdPrefix = getIdPrefix;
function getGameId(GAME_TYPE) {
    switch (GAME_TYPE) {
        case constants_1.RUMMY_TYPES.POOL:
            return constants_1.GAME_IDS.POOL;
        case constants_1.RUMMY_TYPES.DEALS:
            return constants_1.GAME_IDS.DEALS;
        case constants_1.RUMMY_TYPES.POINTS:
            return constants_1.GAME_IDS.POINTS;
        default:
            return undefined;
    }
}
exports.getGameId = getGameId;
function roundInt(nmbr, decimalCount) {
    let cardPoints = nmbr;
    cardPoints = Math.round(cardPoints * Math.pow(10, decimalCount));
    cardPoints /= Math.pow(10, decimalCount);
    return cardPoints;
}
exports.roundInt = roundInt;
function flattenObject(obj) {
    const finalObj = {};
    Object.keys(obj).forEach((val) => {
        const value = obj[val];
        const type = typeof value;
        if (value === undefined) {
            finalObj[val] = "undefined";
        }
        else if (type === 'object') {
            finalObj[val] = JSON.stringify(value);
        }
        else {
            finalObj[val] = value;
        }
    });
    return finalObj;
}
exports.flattenObject = flattenObject;
function getRandomTableId() {
    const tableId = (0, uuid_1.v4)();
    return tableId.replace(/-/g, '');
}
exports.getRandomTableId = getRandomTableId;
/**
 * remove pick card from grouping cards and send updated grouping cards
 * @param {string} removeCard
 * @param {GroupingSchema} groupCards
 * @returns {GroupingSchema}
 * @deprecated
 */
function removePickCardFromGroupingCards(removeCard, groupCards) {
    const gCards = groupCards;
    if (!removeCard || underscore_1.default.isEmpty(groupCards)) {
        return gCards;
    }
    if (gCards.pure.length > 0) {
        const pureCards = gCards.pure;
        for (let i = 0; i < pureCards.length; i++) {
            if (underscore_1.default.contains(pureCards[i], removeCard)) {
                pureCards[i] = underscore_1.default.without(pureCards[i], removeCard);
                break;
            }
        }
        gCards.pure = pureCards;
    }
    if (gCards.seq.length > 0) {
        const seqCards = gCards.seq;
        for (let j = 0; j < seqCards.length; j++) {
            if (underscore_1.default.contains(seqCards[j], removeCard)) {
                seqCards[j] = underscore_1.default.without(seqCards[j], removeCard);
                break;
            }
        }
        gCards.seq = seqCards;
    }
    if (gCards.set.length > 0) {
        const setCards = gCards.set;
        for (let k = 0; k < setCards.length; k++) {
            if (underscore_1.default.contains(setCards[k], removeCard)) {
                setCards[k] = underscore_1.default.without(setCards[k], removeCard);
                break;
            }
        }
        gCards.set = setCards;
    }
    if (gCards.dwd.length > 0) {
        const dwdCards = gCards.dwd;
        for (let l = 0; l < dwdCards.length; l++) {
            if (underscore_1.default.contains(dwdCards[l], removeCard)) {
                dwdCards[l] = underscore_1.default.without(dwdCards[l], removeCard);
                break;
            }
        }
        gCards.dwd = dwdCards;
    }
    return gCards;
}
exports.removePickCardFromGroupingCards = removePickCardFromGroupingCards;
function removePickCardFromCards(removeCard, groupCards) {
    const gCards = groupCards;
    if (!removeCard || underscore_1.default.isEmpty(groupCards)) {
        return gCards;
    }
    for (let j = 0; j < groupCards.length; j++) {
        const group = groupCards[j];
        if (underscore_1.default.contains(group, removeCard)) {
            groupCards[j] = underscore_1.default.without(group, removeCard);
            break;
        }
    }
    return gCards;
}
exports.removePickCardFromCards = removePickCardFromCards;
function issGroupingCardAndCurrentCardSame(currentCards, groupCards) {
    const flagGroupCards = groupCards.flat(1);
    const sortedGroupCards = flagGroupCards.sort();
    const sortedCurrentCards = [...currentCards].sort();
    /**
     * Taking maximum of grouping and current cards.
     * this will thow error also if the length of two are not same
     */
    const loopTill = Math.max(currentCards.length, flagGroupCards.length);
    for (let i = 0; i < loopTill; ++i) {
        if (sortedCurrentCards[i] !== sortedGroupCards[i]) {
            return false;
        }
    }
    return true;
}
exports.issGroupingCardAndCurrentCardSame = issGroupingCardAndCurrentCardSame;
/**
 * Gets the drop points as per first or middle drop
 * @param {Boolean} isFirstTurn
 * @param {number} maxPoints
 * @returns {Number}
 */
function getDropPoints(isFirstTurn, maxPoints, gameType, playerCount) {
    let points = 0;
    if (gameType === constants_1.RUMMY_TYPES.DEALS) {
        if (playerCount > constants_1.NUMERICAL.TWO) {
            if (isFirstTurn)
                points = constants_1.POINTS.FIRST_DROP;
            else
                points = constants_1.POINTS.MIDDLE_DROP;
        }
        else
            points = constants_1.POINTS.TIMEOUT_DROP;
    }
    else {
        if (maxPoints === constants_1.POOL_TYPES.TWO_ZERO_ONE) {
            // If first turn
            if (isFirstTurn)
                points = constants_1.POINTS.FIRST_DROP_201;
            // else If first turn
            else
                points = constants_1.POINTS.MIDDLE_DROP_201;
        }
        else if (maxPoints === constants_1.POOL_TYPES.SIXTY_ONE) {
            if (isFirstTurn)
                points = constants_1.POINTS.FIRST_DROP_61;
            else
                points = constants_1.POINTS.MIDDLE_DROP_61;
        }
        // If first turn
        else if (isFirstTurn)
            points = constants_1.POINTS.FIRST_DROP;
        // else If first turn
        else
            points = constants_1.POINTS.MIDDLE_DROP;
    }
    return points;
}
exports.getDropPoints = getDropPoints;
function getDropStatus(points, isAutoDrop) {
    if (points < constants_1.POINTS.MIDDLE_DROP_61) {
        return isAutoDrop
            ? gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.AUTO_DROP_DROP
            : gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.DROP;
    }
    else {
        return isAutoDrop
            ? gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.AUDO_MIDDLE_DROP
            : gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.MIDDLE_DROP;
    }
}
exports.getDropStatus = getDropStatus;
function isGameTie(playersGameData) {
    const { length } = playersGameData;
    const dealPoint = playersGameData[0] && playersGameData[0].dealPoint;
    for (let i = 1; i < length; ++i) {
        if (!playersGameData[i])
            continue;
        //@ts-ignore
        if (playersGameData[i].dealPoint != dealPoint)
            return false;
    }
    return true;
}
exports.isGameTie = isGameTie;
function getFormat(gameFormat = constants_1.RUMMY_TYPES.MULTI_TABLE_POOL_RUMMY) {
    switch (gameFormat) {
        case constants_1.RUMMY_TYPES.MULTI_TABLE_POOL_RUMMY:
            return constants_1.RUMMY_TYPES.POOL;
        case constants_1.RUMMY_TYPES.MULTI_TABLE_DEALS_RUMMY:
            return constants_1.RUMMY_TYPES.DEALS;
        case constants_1.RUMMY_TYPES.MULTI_TABLE_POINTS_RUMMY:
            return constants_1.RUMMY_TYPES.POINTS;
        default:
            return constants_1.RUMMY_TYPES.POOL;
    }
}
exports.getFormat = getFormat;
function getFormatV2(gameFormat) {
    const format = Number(gameFormat);
    switch (format) {
        case 1:
            return constants_1.RUMMY_TYPES.POOL;
        case 2:
            return constants_1.RUMMY_TYPES.POINTS;
        case 3:
            return constants_1.RUMMY_TYPES.DEALS;
        default:
            return constants_1.RUMMY_TYPES.POOL;
    }
}
exports.getFormatV2 = getFormatV2;
function getBootValue(value, currencyType) {
    // if (currencyType === CURRENCY_TYPE.COINS)
    //   return DEFAULT_COINTS.COINS;
    return value;
}
exports.getBootValue = getBootValue;
function getWinnings(bootValue, rank, noOfPlayers, currencyType, winnings) {
    if (currencyType === tableState_1.CURRENCY_TYPE.COINS) {
        if (rank === constants_1.NUMERICAL.ONE)
            return bootValue * noOfPlayers;
        return -Math.abs(bootValue);
    }
    else {
        return winnings;
    }
}
exports.getWinnings = getWinnings;
function removeEmptyString(str) {
    const arr = str.split(',');
    const newArr = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== '') {
            newArr.push(arr[i]);
        }
    }
    const newStr = newArr.join(',');
    return newStr;
}
exports.removeEmptyString = removeEmptyString;
function isPointsRummyFormat(gameType) {
    return !!(gameType === constants_1.RUMMY_TYPES.POINTS);
}
exports.isPointsRummyFormat = isPointsRummyFormat;
function formatGameDetails(currentRound, tableGamePlayData, currentRoundHistory, winnerId = 0) {
    const gameDetails = [
        {
            roundNo: currentRound,
            roundId: tableGamePlayData._id,
            winnerId,
            createdOn: tableGamePlayData.createdAt,
            modifiedOn: tableGamePlayData.updatedAt,
            extra_info: tableGamePlayData.trumpCard,
            turnsDetails: currentRoundHistory === null || currentRoundHistory === void 0 ? void 0 : currentRoundHistory.turnsDetails,
            userFinalStateTurnDetails: currentRoundHistory === null || currentRoundHistory === void 0 ? void 0 : currentRoundHistory.userFinalStateTurnDetails,
        },
    ];
    return gameDetails;
}
exports.formatGameDetails = formatGameDetails;
// send auto debit info after updating wallet
function sendAutoDebitInfo(payload) {
    const { socketId, tableId, userId } = payload;
    let { amount = 0 } = payload;
    amount = roundInt(amount, 2);
    newLogger_1.Logger.info(`sendAutoDebitInfo tableId: ${tableId}, 
      userId: ${userId}, 
      socketId: ${socketId}
      amount: ${amount}`);
    let msg = connections_1.zk.getConfig().ADM;
    msg = msg.replace('#80', `${amount}`);
    const responseData = {
        userId,
        tableId,
        message: msg, // config().ADM,
    };
    socketOperation_1.socketOperation.sendEventToClient(socketId, responseData, constants_1.EVENTS.AUTO_DEBIT_INFO_SOCKET_EVENT);
}
exports.sendAutoDebitInfo = sendAutoDebitInfo;
function updateUserCash(playerGamePlayData, tableId, currentRound, userCashAmount, gamePlaytext, playerData, option) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!playerGamePlayData && !(option === null || option === void 0 ? void 0 : option.isAddCashUpdate))
                return false;
            userCashAmount = Number(userCashAmount);
            const userCashObj = ((playerData === null || playerData === void 0 ? void 0 : playerData.userTablesCash) &&
                (playerData === null || playerData === void 0 ? void 0 : playerData.userTablesCash.find((utc) => utc.tableId === tableId))) || { userCash: 0 };
            let netUserCashAmount = 
            // userCashAmount + 500 < 0 ? 0 : userCashAmount + 500;
            userCashAmount + userCashObj.userCash < 0
                ? 0
                : userCashAmount + userCashObj.userCash;
            netUserCashAmount = roundInt(netUserCashAmount, 2);
            playerData.userTablesCash = playerData.userTablesCash.map((utc) => {
                if (utc.tableId === tableId) {
                    utc.userCash = netUserCashAmount;
                }
                return utc;
            });
            // created a block to keep data seperate from outer declarations
            const data = {
                tableId,
                userId: playerGamePlayData
                    ? playerGamePlayData.userId
                    : playerData.id,
                userCash: netUserCashAmount,
                reason: gamePlaytext,
            };
            socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.UPDATE_USER_CASH_SOCKET_EVENT, data);
            if (playerGamePlayData) {
                yield playerGameplay_1.playerGameplayService.setPlayerGameplay(playerGamePlayData.userId, tableId, currentRound, playerGamePlayData);
            }
            yield userProfile_1.userProfileService.setUserDetails(playerData.id, playerData);
            return netUserCashAmount;
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Validation Error at updateUserCash: `, [error]);
        }
    });
}
exports.updateUserCash = updateUserCash;
function setUserCash(tableId, userCashAmount, gamePlaytext, playerData, isNewUI) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            userCashAmount = Number(userCashAmount);
            playerData.userTablesCash = playerData.userTablesCash.map((utc) => {
                if (utc.tableId === tableId) {
                    utc.userCash = userCashAmount;
                }
                return utc;
            });
            // created a block to keep data seperate from outer declarations
            const data = {
                tableId,
                userId: playerData.id,
                userCash: userCashAmount,
                reason: gamePlaytext,
            };
            socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.UPDATE_USER_CASH_SOCKET_EVENT, data);
            yield userProfile_1.userProfileService.setUserDetails(playerData.id, playerData);
            if (isNewUI) {
                yield userService_1.userService.getUserBalance(playerData.id, playerData.socketId, playerData.token);
            }
            return userCashAmount;
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Validation Error at setUserCash: `, [error]);
            return 0;
        }
    });
}
exports.setUserCash = setUserCash;
function getRoundEndReason(playerGameplay, winnerId) {
    const { userId } = playerGameplay;
    let gameEndReason = winnerId === userId
        ? gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.WINNER
        : playerGameplay.gameEndReason;
    if (!gameEndReason)
        gameEndReason =
            playerGameplay.userStatus === constants_1.PLAYER_STATE.FINISH
                ? gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.LOST
                : gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.ELIMINATED;
    return gameEndReason;
}
exports.getRoundEndReason = getRoundEndReason;
function getBot(lobbyAmount) {
    return __awaiter(this, void 0, void 0, function* () {
        const botData = yield userService_2.default.getAvailableBot(lobbyAmount);
        if (botData) {
            return botData;
        }
        else {
            yield userService_2.default.generateBot();
            return getBot(lobbyAmount);
        }
    });
}
exports.getBot = getBot;
