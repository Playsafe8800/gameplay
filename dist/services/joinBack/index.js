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
exports.joinBack = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const connections_1 = require("../../connections");
const constants_1 = require("../../constants");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const utils_1 = require("../../utils");
const errors_1 = require("../../utils/errors");
const redlock_2 = require("../../utils/lock/redlock");
const cancelBattle_1 = require("../gameplay/cancelBattle");
const tableOperation_1 = require("../signUp/tableOperation");
function joinBack(data, socket, networkParams) {
    return __awaiter(this, void 0, void 0, function* () {
        const { tableId } = data;
        const { userId } = socket;
        const lockStates = [
            constants_1.TABLE_STATE.LOCK_IN_PERIOD,
            constants_1.TABLE_STATE.WINNER_DECLARED,
            constants_1.TABLE_STATE.ROUND_STARTED,
            // -------------- temp lock states ---------------
        ];
        const freeStates = [
            constants_1.TABLE_STATE.WAITING_FOR_PLAYERS,
            constants_1.TABLE_STATE.ROUND_TIMER_STARTED,
        ];
        let lock;
        try {
            // this lock secure three flows, joinback, insertNewPlayer and GameTableInitiation
            lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 3000);
            newLogger_1.Logger.info(`Lock acquire in joinback: ${lock.resource}`);
            const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                'maximumPoints',
                '_id',
                'bootValue',
                'currentRound',
                'lobbyId',
                'currencyType',
                'dealsCount',
                'gameType',
                'maximumSeat',
                'currentRound',
                'minimumSeat',
                'gameStartTimer',
                'bootValue',
            ]);
            const { currentRound } = tableConfigData; // need to get or update latest round
            const [tableGamePlayData, userProfile] = yield Promise.all([
                tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                    'standupUsers',
                    'tableState',
                    'seats',
                ]),
                userProfile_1.userProfileService.getUserDetailsById(userId),
            ]);
            const { tableState, seats } = tableGamePlayData;
            const currentPlayersInTable = seats.filter((ele) => ele._id).length;
            if (lockStates.includes(tableState)) {
                socketOperation_1.socketOperation.sendEventToClient(socket, {
                    cta: 'cnsp',
                    msg: connections_1.zk.getConfig().CNSP,
                }, constants_1.EVENTS.OPEN_GAME_POPUP_SOCKET_EVENT);
            }
            else if (currentPlayersInTable === tableConfigData.maximumSeat) {
                socketOperation_1.socketOperation.sendEventToClient(socket, {
                    cta: 'sfm',
                    msg: connections_1.zk.getConfig().SFM,
                }, constants_1.EVENTS.OPEN_GAME_POPUP_SOCKET_EVENT);
            }
            else if (freeStates.includes(tableState) &&
                currentPlayersInTable < tableConfigData.maximumSeat) {
                const minCashValue = tableConfigData.bootValue * constants_1.POINTS.MAX_DEADWOOD_POINTS;
                userProfile.userCash = (0, utils_1.roundInt)(userProfile.userCash, 2);
                if (userProfile.userCash < minCashValue) {
                    // alertPopup.InsufficientFundWithAddCash(
                    //   socket,
                    //   zk.getConfig().IPM,
                    //   INSUFFICIENT_FUND_REASONS.JOIN_BACK_AFTER_STAND_UP_IFE,
                    //   {
                    //     apkVersion: Number(userProfile.apkVersion),
                    //     tableId,
                    //     userId: userId.toString(),
                    //   },
                    // );
                    return false;
                }
                const newStdP = tableGamePlayData.standupUsers.filter((stData) => stData._id !== userId);
                tableGamePlayData.standupUsers = newStdP;
                yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGamePlayData);
                const gtiData = yield tableOperation_1.tableOperation.insertNewPlayer(socket, userProfile, tableConfigData, true, networkParams);
                const response = {
                    signupResponse: {
                        userId,
                        username: userProfile.userName,
                        profilePicture: userProfile.avatarUrl,
                    },
                    gameTableInfoData: [gtiData],
                };
                return response;
            }
        }
        catch (error) {
            newLogger_1.Logger.error('INTERNAL_SERVER_ERROR _CATCH_ERROR_: on joinback', [error]);
            if (error instanceof errors_1.CancelBattleError) {
                cancelBattle_1.cancelBattle.cancelBattle(data.tableId, error);
            }
            throw error;
        }
        finally {
            try {
                if (lock && lock instanceof redlock_1.Lock) {
                    yield redlock_2.redlock.Lock.release(lock);
                    newLogger_1.Logger.info(`Lock releasing, in joinback; resource:, ${lock.resource}`);
                }
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on joinback: ${err}`);
            }
        }
    });
}
exports.joinBack = joinBack;
