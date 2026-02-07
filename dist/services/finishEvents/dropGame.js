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
exports.handleAutoDrop = exports.dropGame = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const turnHistory_1 = require("../../db/turnHistory");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const events_1 = require("../../state/events");
const utils_1 = require("../../utils");
const date_1 = require("../../utils/date");
const index_1 = require("../../utils/errors/index");
const getPlayingUserInRound_1 = require("../../utils/getPlayingUserInRound");
const redlock_2 = require("../../utils/lock/redlock");
const validators_1 = require("../../validators");
const cancelBattle_1 = require("../gameplay/cancelBattle");
const turn_1 = require("../gameplay/turn");
const switchTable_1 = require("../leaveTable/switchTable");
const schedulerQueue_1 = require("../schedulerQueue");
const winner_1 = require("./winner");
const winnerPoints_1 = require("./winnerPoints");
const turnHistory_2 = require("../../utils/turnHistory");
const helper_1 = require("../../mixpanel/helper");
function handleInvalidDeclareDrop(tableConfigData, playersGamePlayData, playerGamePlayData, tableGamePlayData, playerData, currentRoundHistory) {
    return __awaiter(this, void 0, void 0, function* () {
        newLogger_1.Logger.info(`handleInvalidDeclareDrop: ${tableConfigData._id}`, [
            tableConfigData,
            playersGamePlayData,
            playerGamePlayData,
            tableGamePlayData,
            playerData,
        ]);
        const { currentRound, _id: tableId } = tableConfigData;
        const { userId } = playerGamePlayData;
        let points = 0;
        if (tableConfigData.gameType === constants_1.RUMMY_TYPES.DEALS) {
            points = constants_1.POINTS.MAX_DEADWOOD_POINTS;
        }
        else {
            points =
                tableConfigData.maximumPoints === constants_1.POOL_TYPES.SIXTY_ONE
                    ? constants_1.POINTS.MAX_DEADWOOD_POINTS_61
                    : constants_1.POINTS.MAX_DEADWOOD_POINTS;
        }
        playerGamePlayData.userStatus = constants_1.PLAYER_STATE.LOST;
        playerGamePlayData.gameEndReason =
            playerGamePlayData.gameEndReason ||
                constants_1.GAME_END_REASONS_INSTRUMENTATION.LOST;
        playerGamePlayData.points = points;
        const playingPlayers = (0, getPlayingUserInRound_1.getPlayingUserInRound)(playersGamePlayData, true).filter((ele) => ele.userId !== userId);
        if (tableConfigData.gameType === constants_1.RUMMY_TYPES.POOL) {
            playerGamePlayData.dealPoint += points;
        }
        else if (tableConfigData.gameType === constants_1.RUMMY_TYPES.DEALS) {
            (0, utils_1.deductScoreForDeals)(playerGamePlayData, tableGamePlayData, points);
        }
        else {
            playerGamePlayData.dealPoint -= points;
        }
        tableGamePlayData.totalPlayerPoints += points;
        currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].points = points;
        currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].turnStatus = constants_1.TURN_HISTORY.INVALID_DECLARE;
        playerGamePlayData.invalidDeclare = true;
        tableGamePlayData.tableState = constants_1.TABLE_STATE.ROUND_STARTED;
        const currentTurnData = {
            points,
            turnStatus: constants_1.TURN_HISTORY.INVALID_DECLARE,
        };
        yield Promise.all([
            tableConfiguration_1.tableConfigurationService.setTableConfiguration(tableConfigData._id, tableConfigData),
            tableGameplay_1.tableGameplayService.setTableGameplay(tableConfigData._id, currentRound, tableGamePlayData),
            playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlayData),
            (0, turnHistory_2.UpdateTurnDetails)(tableId, currentRound, currentTurnData),
            turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory),
        ]);
        const tableResponse = {
            tableId,
            userId,
            totalPoints: playerGamePlayData.dealPoint,
            status: constants_1.PLAYER_STATE.LOST.toLowerCase(),
        };
        (0, validators_1.validateDropCardRoomRes)(tableResponse);
        yield Promise.all([
            socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.DROP_SOCKET_EVENT, tableResponse),
            events_1.eventStateManager.fireEventUser(tableId, userId, constants_1.USER_EVENTS.FINISH, date_1.dateUtils.getCurrentEpochTime()),
        ]);
        newLogger_1.Logger.info('handleInvalidDeclareDrop: playing players', [
            playingPlayers,
        ]);
        /**
         * If table has only two activePlayers (incl player who did invalid declare)
         * perform rummy format specific action
         */
        if (playingPlayers.length < 2) {
            // declare the winner
            yield winner_1.winner.handleWinner(playerGamePlayData, tableConfigData, tableGamePlayData);
        }
        else {
            yield (0, turn_1.changeTurn)(tableId);
        }
    });
}
function handleDrop(tableConfigData, playersGamePlayData, playerGamePlayData, tableGamePlayData, playerData, currentRoundHistory, networkParams) {
    return __awaiter(this, void 0, void 0, function* () {
        newLogger_1.Logger.info(`Normal drop game: ${tableConfigData._id}`, [
            tableConfigData,
            playersGamePlayData,
            playerGamePlayData,
            tableGamePlayData,
            playerData,
        ]);
        const { currentRound, maximumPoints, _id: tableId, } = tableConfigData;
        const { userId } = playerGamePlayData;
        const points = (0, utils_1.getDropPoints)(playerGamePlayData.isFirstTurn, maximumPoints, tableConfigData.gameType, tableConfigData.maximumSeat);
        const playingPlayers = (0, getPlayingUserInRound_1.getPlayingUserInRound)(playersGamePlayData, true).filter((ele) => ele.userId !== userId);
        playerGamePlayData.gameEndReason =
            playerGamePlayData.gameEndReason ||
                (0, utils_1.getDropStatus)(points, playerGamePlayData.isAutoDrop);
        playerGamePlayData.userStatus = constants_1.PLAYER_STATE.DROP;
        playerGamePlayData.points = points;
        if (tableConfigData.gameType === constants_1.RUMMY_TYPES.POOL) {
            playerGamePlayData.dealPoint += points;
        }
        else if (tableConfigData.gameType === constants_1.RUMMY_TYPES.DEALS) {
            (0, utils_1.deductScoreForDeals)(playerGamePlayData, tableGamePlayData, points);
        }
        else {
            playerGamePlayData.dealPoint -= points;
        }
        tableGamePlayData.totalPlayerPoints += points;
        currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].points = points;
        currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].turnStatus = constants_1.TURN_HISTORY.DROP;
        const currentTurnData = {
            points,
            turnStatus: constants_1.TURN_HISTORY.DROP,
        };
        yield Promise.all([
            tableConfiguration_1.tableConfigurationService.setTableConfiguration(tableConfigData._id, tableConfigData),
            tableGameplay_1.tableGameplayService.setTableGameplay(tableConfigData._id, currentRound, tableGamePlayData),
            playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlayData),
            (0, turnHistory_2.UpdateTurnDetails)(tableId, currentRound, currentTurnData),
            turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory),
        ]);
        const tableResponse = {
            tableId,
            userId,
            totalPoints: playerGamePlayData.dealPoint,
            status: constants_1.PLAYER_STATE.DROP.toLowerCase(),
        };
        (0, validators_1.validateDropCardRoomRes)(tableResponse);
        Promise.all([
            socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.DROP_SOCKET_EVENT, tableResponse),
            events_1.eventStateManager.fireEventUser(tableId, userId, constants_1.USER_EVENTS.DROP, (networkParams === null || networkParams === void 0 ? void 0 : networkParams.timeStamp) || date_1.dateUtils.getCurrentEpochTime()),
        ]);
        newLogger_1.Logger.info('handleDrop: playing players', [playingPlayers]);
        // cancel player turn timer
        schedulerQueue_1.scheduler.cancelJob.playerTurnTimer(tableId, userId);
        /**
         * If available players are greater than 2 (before dropping this user)
         * proceed with drop and setup next turn
         */
        if (playingPlayers.length < 2) {
            // declare the winner
            yield winner_1.winner.handleWinner(playerGamePlayData, tableConfigData, tableGamePlayData);
        }
        else {
            yield (0, turn_1.changeTurn)(tableConfigData._id);
        }
    });
}
function handleDropForPoints(tableConfigData, playersGamePlayData, playerGamePlayData, tableGamePlayData, playerData, currentRoundHistory, networkParams, option, socket) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        newLogger_1.Logger.info(`Normal drop game points: ${tableConfigData._id}`, [
            tableConfigData,
            playersGamePlayData,
            playerGamePlayData,
            tableGamePlayData,
            playerData,
        ]);
        const { currentRound, maximumPoints, _id: tableId, currencyFactor, } = tableConfigData;
        const { userId } = playerGamePlayData;
        const points = (0, utils_1.getDropPoints)(playerGamePlayData.isFirstTurn, maximumPoints, tableConfigData.gameType, tableConfigData.maximumSeat);
        const pointsAsPerCF = (0, utils_1.roundInt)(currencyFactor * points, 2);
        const currentTurnData = {
            points: points,
            turnStatus: points === constants_1.NUMERICAL.TWENTY
                ? constants_1.TURN_HISTORY.DROP
                : constants_1.TURN_HISTORY.MIDDLE_DROP,
        };
        currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].points = points;
        currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].turnStatus =
            points === constants_1.NUMERICAL.TWENTY
                ? constants_1.TURN_HISTORY.DROP
                : constants_1.TURN_HISTORY.MIDDLE_DROP;
        const gameDetails = (0, utils_1.formatGameDetails)(currentRound, tableGamePlayData, currentRoundHistory);
        const dropUserData = {
            si: playerGamePlayData.seatIndex,
            userId: playerGamePlayData.userId,
            sessionId: playerGamePlayData.tableSessionId,
            score: -points,
            gameEndReason: constants_1.GAME_END_REASONS.DROP,
            roundEndReason: playerGamePlayData.gameEndReason ||
                constants_1.GAME_END_REASONS_INSTRUMENTATION.DROP,
            decimalScore: (0, utils_1.roundInt)(-points, 2),
            gameDetails,
            tableId,
            gameType: tableConfigData.gameType,
            lobbyId: tableConfigData.lobbyId,
            currentRound,
            startingUsersCount: tableGamePlayData.noOfPlayers,
        };
        // const grpcUpdateBattle = await grpcBattle.sendUpdateUserBattleScore(
        //   dropUserData,
        //   playerData.socketId,
        // );
        const userCashValue = ((_a = playerData.userTablesCash.find((utc) => utc.tableId === tableId)) === null || _a === void 0 ? void 0 : _a.userCash) || 0;
        // let userLostCashValue = pointsAsPerCF;
        // if (grpcUpdateBattle.playerData) {
        //   playerGamePlayData.isPlayAgain =
        //     !!grpcUpdateBattle.playerData?.canPlayAgain;
        //   // update rummy wallet if autoDebited true
        //   const isAmountAutoDebited =
        //     grpcUpdateBattle.playerData?.pointRummyAutoDebit
        //       ?.isAutoDebitDone;
        //   if (isAmountAutoDebited) {
        //     const autoDebitAmount =
        //       grpcUpdateBattle.playerData?.pointRummyAutoDebit?.moneyDetail
        //         ?.amount;
        //     if (autoDebitAmount) {
        //       userLostCashValue -= Number(autoDebitAmount);
        //       sendAutoDebitInfo({
        //         socketId: playerData.socketId,
        //         tableId,
        //         userId,
        //         amount: autoDebitAmount,
        //         socket,
        //       });
        //       Logger.info(
        //         `handleDropForPoints: tableId: ${tableId} `,
        //         `pointRummyAutoDebit/amount ${autoDebitAmount},
        //           pointsAsPerCF: ${pointsAsPerCF}, userLostCashValue: ${userLostCashValue}`,
        //       );
        //     }
        //   }
        //   const userTableRummyWallet =
        //     grpcUpdateBattle.playerData?.pointRummyWallet?.amount;
        //   userCashValue = await setUserCash(
        //     tableId,
        //     userTableRummyWallet,
        //     'Card Drop Deduction',
        //     playerData,
        //     tableGamePlayData.seats,
        //   );
        //   const { socketId } = playerData;
        //   // update user balance
        //   userService.getUserBalance(
        //     userId,
        //     socketId,
        //     playerGamePlayData.tableSessionId || '',
        //   );
        // }
        playerGamePlayData.userStatus = constants_1.PLAYER_STATE.DROP;
        playerGamePlayData.gameEndReason =
            playerGamePlayData.gameEndReason ||
                (0, utils_1.getDropStatus)(points, playerGamePlayData.isAutoDrop);
        playerGamePlayData.points = points;
        playerGamePlayData.winningCash = -pointsAsPerCF;
        tableGamePlayData.potValue += pointsAsPerCF;
        tableGamePlayData.totalPlayerPoints += points;
        yield Promise.all([
            tableConfiguration_1.tableConfigurationService.setTableConfiguration(tableConfigData._id, tableConfigData),
            tableGameplay_1.tableGameplayService.setTableGameplay(tableConfigData._id, currentRound, tableGamePlayData),
            playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlayData),
            (0, turnHistory_2.UpdateTurnDetails)(tableId, currentRound, currentTurnData),
            turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory),
        ]);
        const userProfileDataPromise = tableGamePlayData.seats.map((seat) => userProfile_1.userProfileService.getUserDetailsById(seat._id));
        const userProfileData = yield Promise.all(userProfileDataPromise);
        for (const user of userProfileData) {
            if (user) {
                const pointsForDrop = (0, utils_1.getDropPoints)(playerGamePlayData.isFirstTurn, tableConfigData.maximumPoints, tableConfigData.gameType, tableConfigData.maximumSeat);
                const potValue = tableConfigData.currencyFactor * pointsForDrop;
                if (!tableGamePlayData.potValue)
                    tableGamePlayData.potValue = 0;
                tableGamePlayData.potValue += potValue;
                if (userId == user.id && (option === null || option === void 0 ? void 0 : option.dropAndSwitch)) {
                    socketOperation_1.socketOperation.removeClientFromRoom(tableId, user.socketId);
                }
                const tableResponse = {
                    tableId,
                    userId,
                    totalPoints: points,
                    status: constants_1.PLAYER_STATE.DROP.toLowerCase(),
                    potValue: tableGamePlayData.potValue,
                    userCash: userCashValue,
                    winningCash: -playerGamePlayData.winningCash,
                };
                (0, validators_1.validateDropCardRoomPointsRes)(tableResponse);
                socketOperation_1.socketOperation.sendEventToClient(user.socketId, tableResponse, constants_1.EVENTS.DROP_SOCKET_EVENT);
            }
        }
        yield Promise.all([
            tableGameplay_1.tableGameplayService.setTableGameplay(tableConfigData._id, currentRound, tableGamePlayData),
            events_1.eventStateManager.fireEventUser(tableId, userId, constants_1.USER_EVENTS.DROP, (networkParams === null || networkParams === void 0 ? void 0 : networkParams.timeStamp) || date_1.dateUtils.getCurrentEpochTime()),
        ]);
        // cancel player turn timer
        schedulerQueue_1.scheduler.cancelJob.playerTurnTimer(tableId, userId);
        if (option === null || option === void 0 ? void 0 : option.dropAndSwitch) {
            // switch table
            return yield (0, switchTable_1.switchTable)({
                userId,
                tableId,
                isDropNSwitch: true,
            }, socket);
        }
        const playingPlayers = (0, getPlayingUserInRound_1.getPlayingUserInRound)(playersGamePlayData, true).filter((ele) => ele.userId !== userId);
        newLogger_1.Logger.info(`handleDropForPoints: playing players: ${tableId}`, [
            playingPlayers,
        ]);
        /**
         * If available players are greater than 2 (before dropping this user)
         * proceed with drop and setup next turn
         */
        if (playingPlayers.length < 2) {
            // declare the winner
            yield winnerPoints_1.winnerPoints.handleWinnerPoints(tableId, currentRound, playingPlayers[0].userId);
        }
        else {
            yield (0, turn_1.changeTurn)(tableConfigData._id);
        }
    });
}
function handleInvalidDeclareDropPoints(tableConfigData, playersGamePlayData, playerGamePlayData, tableGamePlayData, playerData, currentRoundHistory) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        newLogger_1.Logger.info(`handleInvalidDeclareDropPoints: ${tableConfigData._id}`, [
            tableConfigData,
            playersGamePlayData,
            playerGamePlayData,
            tableGamePlayData,
            playerData,
        ]);
        const { _id: tableId, currentRound, currencyFactor, } = tableConfigData;
        const { userId } = playerGamePlayData;
        const points = constants_1.POINTS.MAX_DEADWOOD_POINTS;
        const pointsAsPerCF = (0, utils_1.roundInt)(currencyFactor * points, 2);
        const currentTurnData = {
            points: points,
            turnStatus: constants_1.TURN_HISTORY.INVALID_DECLARE,
        };
        currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].points = points;
        currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].turnStatus = constants_1.TURN_HISTORY.INVALID_DECLARE;
        const gameDetails = (0, utils_1.formatGameDetails)(currentRound, tableGamePlayData, currentRoundHistory);
        const dropUserData = {
            si: playerGamePlayData.seatIndex,
            userId: playerGamePlayData.userId,
            sessionId: playerGamePlayData.tableSessionId,
            score: -points,
            gameEndReason: constants_1.GAME_END_REASONS.INVALID_DECLARE,
            roundEndReason: constants_1.GAME_END_REASONS_INSTRUMENTATION.INVALID_DECLARE,
            decimalScore: (0, utils_1.roundInt)(-points, 2),
            gameDetails,
            tableId,
            gameType: tableConfigData.gameType,
            lobbyId: tableConfigData.lobbyId,
            currentRound,
            startingUsersCount: tableGamePlayData.noOfPlayers,
        };
        const userCashValue = ((_a = playerData.userTablesCash.find((utc) => utc.tableId === tableId)) === null || _a === void 0 ? void 0 : _a.userCash) || 0;
        playerGamePlayData.userStatus = constants_1.PLAYER_STATE.LOST;
        playerGamePlayData.gameEndReason =
            playerGamePlayData.gameEndReason ||
                constants_1.GAME_END_REASONS_INSTRUMENTATION.LOST;
        playerGamePlayData.invalidDeclare = true;
        playerGamePlayData.points = points;
        tableGamePlayData.potValue += pointsAsPerCF;
        playerGamePlayData.winningCash = -pointsAsPerCF;
        tableGamePlayData.totalPlayerPoints += points;
        tableGamePlayData.tableState = constants_1.TABLE_STATE.ROUND_STARTED;
        yield Promise.all([
            tableConfiguration_1.tableConfigurationService.setTableConfiguration(tableConfigData._id, tableConfigData),
            tableGameplay_1.tableGameplayService.setTableGameplay(tableConfigData._id, currentRound, tableGamePlayData),
            playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlayData),
            (0, turnHistory_2.UpdateTurnDetails)(tableId, currentRound, currentTurnData),
            turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory),
        ]);
        const tableResponse = {
            tableId,
            userId,
            totalPoints: playerGamePlayData.dealPoint,
            status: constants_1.PLAYER_STATE.LOST.toLowerCase(),
            potValue: tableGamePlayData.potValue,
            userCash: userCashValue,
            winningCash: playerGamePlayData.winningCash,
        };
        (0, validators_1.validateDropCardRoomPointsRes)(tableResponse);
        yield Promise.all([
            socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.DROP_SOCKET_EVENT, tableResponse),
            events_1.eventStateManager.fireEventUser(tableId, userId, constants_1.USER_EVENTS.FINISH, date_1.dateUtils.getCurrentEpochTime()),
        ]);
        const playingPlayers = (0, getPlayingUserInRound_1.getPlayingUserInRound)(playersGamePlayData, true).filter((ele) => ele && ele.userId !== userId);
        newLogger_1.Logger.info('handleInvalidDeclareDropPoints: playing players', [
            playingPlayers,
        ]);
        /**
         * If table has only two activePlayers (incl player who did invalid declare)
         * perform rummy format specific action
         */
        if (playingPlayers.length < 2) {
            // declare the winner
            playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlayData),
                yield winnerPoints_1.winnerPoints.handleWinnerPoints(tableId, currentRound, playingPlayers[0].userId);
        }
        else {
            yield (0, turn_1.changeTurn)(tableId);
        }
    });
}
/**
 * Droping user from game (user can't play but will not leave the seat)
 * calculating points for user who dropped
 * This will called when:
 * 1. user finish with invalid declare
 * 2. user click on drop (first drop / middle drop)
 * 3. user's maximum timeout limit reached
 */
function dropGame(data, client, reason, networkParams) {
    return __awaiter(this, void 0, void 0, function* () {
        let lock;
        try {
            const { userId } = client;
            const { tableId } = data;
            newLogger_1.Logger.info('dropGame: ', [data, userId, reason]);
            (0, validators_1.validateDropCardReq)(data);
            // reason is empty from request handler
            if (!reason) {
                lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 5000);
                newLogger_1.Logger.info(`Lock acquired, in dropGame on resource:, ${lock.resource}`);
            }
            const tableData = (yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                '_id',
                'currentRound',
                'gameType',
                'currencyFactor',
                'lobbyId',
                'gameId',
                'maximumSeat',
                'maximumPoints',
                "currencyType",
                "bootValue"
            ]));
            const { currentRound, gameId, maximumPoints, currencyType, bootValue, maximumSeat } = tableData;
            const [tableGamePlayData, userProfileData, turnHistory,] = yield Promise.all([
                tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                    '_id',
                    'seats',
                    'currentTurn',
                    'createdAt',
                    'updatedAt',
                    'trumpCard',
                    'noOfPlayers',
                    'potValue',
                    'totalPlayerPoints',
                    'tableState',
                    'pointsForRoundWinner',
                    'declarePlayer',
                ]),
                userProfile_1.userProfileService.getOrCreateUserDetailsById(userId),
                turnHistory_1.turnHistoryService.getTurnHistory(tableId, currentRound),
            ]);
            let playersGameData = yield Promise.all(tableGamePlayData.seats.map((e) => playerGameplay_1.playerGameplayService.getPlayerGameplay(e._id, tableId, currentRound, [
                'userId',
                'userStatus',
                'currentCards',
                'dealPoint',
                'gameEndReason',
                'isFirstTurn',
                'seatIndex',
                'tableSessionId',
                'isAutoDrop',
                'winningCash',
            ])));
            playersGameData = playersGameData.filter((e) => e);
            const playerGameData = playersGameData.find((e) => e.userId === userId) || {};
            (0, helper_1.sendDropMixpanel)(currencyType, gameId, maximumPoints, bootValue, userId, tableId, currentRound, maximumSeat, userProfileData.isBot, true, false);
            /**
             * If ROUND_STARTED &&
             * User is not already Droped &&
             * It's user's turn
             */
            const isUserPlaying = playerGameData.userStatus === constants_1.PLAYER_STATE.PLAYING ||
                playerGameData.userStatus === constants_1.PLAYER_STATE.FINISH;
            if (isUserPlaying &&
                userId === tableGamePlayData.currentTurn &&
                playerGameData.currentCards.length === constants_1.NUMERICAL.THIRTEEN) {
                switch (reason) {
                    case constants_1.GAME_END_REASONS.INVALID_DECLARE:
                        if ((0, utils_1.isPointsRummyFormat)(tableData.gameType)) {
                            yield handleInvalidDeclareDropPoints(tableData, playersGameData, playerGameData, tableGamePlayData, userProfileData, turnHistory);
                        }
                        else {
                            yield handleInvalidDeclareDrop(tableData, playersGameData, playerGameData, tableGamePlayData, userProfileData, turnHistory);
                        }
                        break;
                    default:
                        if ((0, utils_1.isPointsRummyFormat)(tableData.gameType)) {
                            yield handleDropForPoints(tableData, playersGameData, playerGameData, tableGamePlayData, userProfileData, turnHistory, networkParams, {
                                dropAndSwitch: data === null || data === void 0 ? void 0 : data.dropAndSwitch,
                            }, client);
                        }
                        else {
                            yield handleDrop(tableData, playersGameData, playerGameData, tableGamePlayData, userProfileData, turnHistory, networkParams);
                        }
                }
            }
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR dropGame:, ${client === null || client === void 0 ? void 0 : client.userId}, ${data === null || data === void 0 ? void 0 : data.tableId}`, [
                error,
            ]);
            if (error instanceof index_1.CancelBattleError) {
                yield cancelBattle_1.cancelBattle.cancelBattle(data.tableId, error);
            }
        }
        finally {
            try {
                if (lock && lock instanceof redlock_1.Lock) {
                    yield redlock_2.redlock.Lock.release(lock);
                    newLogger_1.Logger.info(`Lock releasing, in dropGame; resource:, ${lock.resource}`);
                }
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on dropGame: ${err}`);
            }
        }
    });
}
exports.dropGame = dropGame;
function handleAutoDrop(data, client) {
    return __awaiter(this, void 0, void 0, function* () {
        let lock;
        try {
            const { userId } = client;
            const { tableId, autoDropEnable, dropAndSwitch } = data;
            newLogger_1.Logger.info('auto drop: ', [data, userId]);
            (0, validators_1.validateAutoDropCardReq)(data);
            lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 5000);
            newLogger_1.Logger.info(`Lock acquired, in auto drop on resource:, ${lock.resource}`);
            const tableData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                'currentRound',
            ]);
            const { currentRound } = tableData;
            const playerGameplayData = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, ['isAutoDrop', 'isAutoDropSwitch']);
            if (!playerGameplayData) {
                throw new Error(`Player gameplay data not found`);
            }
            playerGameplayData.isAutoDrop = autoDropEnable;
            playerGameplayData.isAutoDropSwitch = !!dropAndSwitch;
            yield playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGameplayData);
            return {
                tableId,
                autoDropEnable,
            };
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR dropGame:, ${client === null || client === void 0 ? void 0 : client.userId}, ${data === null || data === void 0 ? void 0 : data.tableId}, ${error.message}`, [error]);
            if (error instanceof index_1.CancelBattleError) {
                yield cancelBattle_1.cancelBattle.cancelBattle(data.tableId, error);
            }
        }
        finally {
            try {
                if (lock && lock instanceof redlock_1.Lock) {
                    yield redlock_2.redlock.Lock.release(lock);
                    newLogger_1.Logger.info(`Lock releasing, in dropGame; resource:, ${lock.resource}`);
                }
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on dropGame: ${err}`);
            }
        }
    });
}
exports.handleAutoDrop = handleAutoDrop;
