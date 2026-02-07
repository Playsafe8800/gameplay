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
exports.updateTGPandPGPandUserProfile = exports.standup = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const underscore_1 = __importDefault(require("underscore"));
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const userProfile_1 = require("../../db/userProfile");
const leaveTable_1 = __importDefault(require("../../services/leaveTable"));
const socketOperation_1 = require("../../socketHandler/socketOperation");
const utils_1 = require("../../utils");
const errors_1 = require("../../utils/errors");
const redlock_2 = require("../../utils/lock/redlock");
const response_validator_1 = require("../../validators/response.validator");
const cancelBattle_1 = require("../gameplay/cancelBattle");
const schedulerQueue_1 = require("../schedulerQueue");
const ShuffleOpenDeck_1 = require("../gameplay/ShuffleOpenDeck");
function standup(data) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const { userId, tableId } = data;
        let lock;
        try {
            if (!(data === null || data === void 0 ? void 0 : data.isDropNStandup)) {
                lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 3000);
                newLogger_1.Logger.info(`lock acquire in standup resource: ${tableId}}`);
            }
            const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                '_id',
                'currentRound',
                'gameType',
                'lobbyId',
                'minimumSeat',
                'currencyFactor',
            ]);
            const { currentRound } = tableConfigData;
            const [tableGamePlayData, playerGamePlayData, userProfileData,] = yield Promise.all([
                tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                    'noOfPlayers',
                    'tableState',
                    'currentTurn',
                    'seats',
                    'standupUsers',
                    'declarePlayer',
                    'potValue',
                    'opendDeck',
                    'totalPlayerPoints',
                    'closedDeck',
                ]),
                playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, ['userId', 'userStatus', 'seatIndex', 'points']),
                userProfile_1.userProfileService.getUserDetailsById(userId),
            ]);
            newLogger_1.Logger.info(`Standup request reason: ${data === null || data === void 0 ? void 0 : data.reason} >> User Table >> \n`, [
                tableConfigData,
                ' \n >> Table Game Play >> \n',
                tableGamePlayData,
                '\n >> Player Game Play >> \n',
                playerGamePlayData,
            ]);
            const { tableState } = tableGamePlayData;
            const canNotStandupStates = [
                constants_1.TABLE_STATE.LOCK_IN_PERIOD,
                constants_1.TABLE_STATE.DECLARED,
            ];
            const safeStates = [
                constants_1.TABLE_STATE.WAITING_FOR_PLAYERS,
                constants_1.TABLE_STATE.ROUND_TIMER_STARTED,
                constants_1.TABLE_STATE.WINNER_DECLARED,
            ];
            const safePlayerStates = [constants_1.PLAYER_STATE.DROP, constants_1.PLAYER_STATE.LOST];
            let isDeckShuffled = false;
            if (((_a = tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.closedDeck) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                yield (0, ShuffleOpenDeck_1.shuffleOpenDeck)({
                    tableGamePlayData,
                    tableId,
                    currentRound,
                });
                isDeckShuffled = true;
            }
            const isUserStandup = tableGamePlayData.standupUsers.find((user) => user._id.toString() === userId.toString());
            if (isUserStandup ||
                playerGamePlayData.userStatus === constants_1.PLAYER_STATE.WATCHING) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR _VALIDATION_: player ${userId} cannot standup 
        beacasue already standup from ${tableId} having tableState ${tableState}`);
                return false;
            }
            else if (canNotStandupStates.includes(tableState)) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR _VALIDATION_: player ${userId}  cannot standup at lock in Period or declare phase 
        from ${tableId} having tableState ${tableState}`);
                return false;
            }
            else if (safeStates.includes(tableState) ||
                safePlayerStates.includes(playerGamePlayData.userStatus)) {
                newLogger_1.Logger.info(`User ${userId} standup on table ${tableId} when game was not started or winner declared 
        or user status could be drop/lost: ${playerGamePlayData.userStatus}`);
                yield updateTGPandPGPandUserProfile(userId, tableId, tableConfigData, tableGamePlayData, userProfileData, true, {
                    playerGamePlay: playerGamePlayData,
                });
                const tableResp = {
                    tableId: tableId,
                    userId: userId,
                    userCash: userProfileData.userCash,
                    totalPoints: 0,
                    potValue: tableGamePlayData.potValue || 0,
                };
                (0, response_validator_1.validateStandupRoomRes)(tableResp);
                socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.STNDUP_SOCKET_EVENT, tableResp);
                // managePlayerOnLeave - call winner or chnage turn
                leaveTable_1.default.managePlayerOnLeave(tableConfigData, tableGamePlayData, isDeckShuffled, playerGamePlayData);
            }
            else {
                newLogger_1.Logger.error(`standup in else ${tableId}:${userId}`);
            }
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR _CATCH_ERROR_: Error from Standup: ${error}`, [
                error,
            ]);
            if (error instanceof errors_1.CancelBattleError) {
                cancelBattle_1.cancelBattle.cancelBattle(data.tableId, error);
                return;
            }
            throw error;
        }
        finally {
            try {
                if (lock && lock instanceof redlock_1.Lock) {
                    yield redlock_2.redlock.Lock.release(lock);
                    newLogger_1.Logger.info(`Lock releasing, in standup; resource:, ${lock.resource}`);
                }
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on standup: ${err}`);
            }
        }
    });
}
exports.standup = standup;
function updateTGPandPGPandUserProfile(userId, tableId, tableConfigurationData, tableGameplayData, userInfo, gameDidNotStart, optionalObj) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { currentRound, minimumSeat, currencyFactor } = tableConfigurationData;
            const { seats } = tableGameplayData;
            if (tableGameplayData.noOfPlayers)
                tableGameplayData.noOfPlayers -= 1;
            // standup before start game or winner declared or userStatus drop/lost
            if (gameDidNotStart) {
                newLogger_1.Logger.info(`TGP seats >> ${tableId}`, [
                    seats.length,
                    `minimum seats ${minimumSeat}`,
                ]);
                if ((tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.standupUsers) &&
                    (optionalObj === null || optionalObj === void 0 ? void 0 : optionalObj.playerGamePlay)) {
                    tableGameplayData.standupUsers.push({
                        _id: userId,
                        seat: (_a = optionalObj.playerGamePlay) === null || _a === void 0 ? void 0 : _a.seatIndex,
                    });
                    tableGameplayData.standupUsers = underscore_1.default.uniq(tableGameplayData.standupUsers, (x) => x._id);
                }
                if (tableGameplayData.tableState ===
                    constants_1.TABLE_STATE.WAITING_FOR_PLAYERS ||
                    tableGameplayData.tableState ===
                        constants_1.TABLE_STATE.ROUND_TIMER_STARTED) {
                    seats.forEach((e) => {
                        if (e._id === userId) {
                            e._id = null;
                        }
                    });
                    let seatedPlayerCount = 0;
                    seats.forEach((e) => {
                        if (e._id === userId) {
                            e._id = null;
                        }
                        else if (e._id)
                            seatedPlayerCount += 1;
                    });
                    tableGameplayData.noOfPlayers = seatedPlayerCount;
                    if (seatedPlayerCount <= minimumSeat) {
                        tableGameplayData.tableState =
                            constants_1.TABLE_STATE.WAITING_FOR_PLAYERS;
                        yield schedulerQueue_1.scheduler.cancelJob.tableStart(tableId);
                    }
                }
            }
            else {
                // standup in game
                const playerGamePlayData = (optionalObj === null || optionalObj === void 0 ? void 0 : optionalObj.playerGamePlay) || {};
                if (optionalObj === null || optionalObj === void 0 ? void 0 : optionalObj.remainingCard)
                    tableGameplayData.opendDeck.push(optionalObj.remainingCard);
                if (tableGameplayData.tableState === constants_1.TABLE_STATE.ROUND_STARTED) {
                    const totalPoints = (optionalObj === null || optionalObj === void 0 ? void 0 : optionalObj.lostPoints) || constants_1.POINTS.MAX_DEADWOOD_POINTS;
                    const pointsAsPerCF = (0, utils_1.roundInt)(currencyFactor * totalPoints, 2);
                    tableGameplayData.potValue += pointsAsPerCF;
                    tableGameplayData.totalPlayerPoints += totalPoints;
                    playerGamePlayData.points = totalPoints;
                }
                playerGamePlayData.userStatus = constants_1.PLAYER_STATE.WATCHING;
                yield playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlayData);
            }
            yield userProfile_1.userProfileService.setUserDetails(userId, userInfo);
            yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameplayData);
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR LeaveTableHandler.updateRedis ${error.message} `, [
                error,
            ]);
            throw error;
        }
    });
}
exports.updateTGPandPGPandUserProfile = updateTGPandPGPandUserProfile;
