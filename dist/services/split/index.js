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
exports.splitHandler = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const connections_1 = require("../../connections");
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const roundScoreBoard_1 = require("../../db/roundScoreBoard");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const deductRake_1 = require("../../utils/deductRake");
const getRandomUUID_1 = require("../../utils/getRandomUUID");
const redlock_2 = require("../../utils/lock/redlock");
const mutant_1 = require("../mutant");
const schedulerQueue_1 = require("../schedulerQueue");
const index_1 = require("../../db/turnHistory/index");
const utils_1 = require("../../utils");
class SplitHandler {
    splitPopup(data, socket) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { tableId } = data;
                if (!tableId)
                    throw new Error('tableId not found from splitPopup');
                newLogger_1.Logger.info(`split popup request for table: ${tableId}, userId: ${socket === null || socket === void 0 ? void 0 : socket.userId}`);
                return {
                    tableId,
                    message: constants_1.SPLIT.POPUP_MSG,
                };
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error found from splitPopup: ${error.message}`, [
                    error,
                ]);
                throw error;
            }
        });
    }
    handleSplitAcceptReject(data, socket) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let lock;
            try {
                const { tableId, splitStatus } = data;
                const { userId } = socket;
                if (!tableId || !userId)
                    throw new Error(`tableId or userId not found from handleSplitAcceptReject`);
                // lock acquire
                lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 2000);
                const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    '_id',
                    'currentRound',
                    'gameType',
                    'lobbyId',
                    'rakePercentage',
                    'maximumPoints',
                    'rebuyUsed',
                    'isNewGameTableUI',
                ]);
                if (!tableConfigData)
                    throw new Error(`tableConfigData not found for table: ${tableId} from handleSplitAcceptReject`);
                const { currentRound } = tableConfigData;
                let responseData = null;
                if (splitStatus === constants_1.SPLIT_STATUS.ACCEPTED) {
                    responseData = yield this.handleSplitAccept(userId, tableConfigData);
                }
                else {
                    // if even one user declined the split offer. we remove the data
                    responseData = yield this.handleSplitReject(userId, tableConfigData);
                }
                if (!responseData) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR responseData null for table: ${tableId}`);
                    return false;
                }
                newLogger_1.Logger.error(`handleSplitAcceptReject: table: ${tableId}, responseData: `, [responseData]);
                yield tableGameplay_1.tableGameplayService.updateSplitRequest(tableId, responseData);
                const { isSplitable, result } = responseData;
                delete responseData.isSplitable;
                delete responseData.result;
                let grpcRes;
                if (responseData.grpcRes) {
                    grpcRes = responseData.grpcRes;
                    delete responseData.grpcRes;
                }
                if (responseData) {
                    socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.SPLIT_INFORMATION, responseData);
                }
                if (result === constants_1.NUMERICAL.ONE) {
                    /**
                     * getting data
                     */
                    const tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['tableState']);
                    tableGameData.tableState = constants_1.TABLE_STATE.PLAY_MORE;
                    /**
                     * saving table state
                     */
                    yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameData);
                    // cancelling timer
                    schedulerQueue_1.scheduler.cancelJob.tableStart(tableId);
                    schedulerQueue_1.scheduler.cancelJob.roundStart(tableId);
                    schedulerQueue_1.scheduler.cancelJob.roundTimerStart(tableId, currentRound);
                    schedulerQueue_1.scheduler.cancelJob.initialTurnSetup(tableId, currentRound);
                    if (responseData.tableGamePlayData &&
                        responseData.playersGamePlayData) {
                        yield this.buildGameDataForSplit(tableConfigData, (_a = responseData.tableGamePlayData.seats) === null || _a === void 0 ? void 0 : _a.length, responseData.playersGamePlayData);
                    }
                    // set playMoreDelayTimer
                    // scheduler.addJob.playMoreDelay(
                    //   tableId,
                    //   tableGameData,
                    //   isSplitable.playingPlayers,
                    //   grpcRes,
                    //   tableConfigData,
                    // );
                    // send updated final round scoreboard after split accepted for newUI
                    if (tableConfigData === null || tableConfigData === void 0 ? void 0 : tableConfigData.isNewGameTableUI) {
                        const winnerData = yield roundScoreBoard_1.roundScoreBoardService.getRoundScoreBoard(tableId, currentRound - 1);
                        if ((_b = winnerData === null || winnerData === void 0 ? void 0 : winnerData.playerInfo) === null || _b === void 0 ? void 0 : _b.length) {
                            const splitAcceptedUserIds = (responseData === null || responseData === void 0 ? void 0 : responseData.playerInfo)
                                ? responseData === null || responseData === void 0 ? void 0 : responseData.playerInfo.map((pl) => {
                                    if (pl.splitStatus)
                                        return pl.userId;
                                })
                                : [];
                            winnerData.tableState = constants_1.TABLE_STATE.WINNER_DECLARED;
                            winnerData.split = false;
                            winnerData.splitAmountPerPlayer = 0;
                            winnerData.splitUsers = [];
                            winnerData.playerInfo.forEach((player) => {
                                const grpcPlayerData = grpcRes === null || grpcRes === void 0 ? void 0 : grpcRes.playersData.find((p) => p.userId === player.userId);
                                player.rank = grpcPlayerData.rank || 0;
                                if (splitAcceptedUserIds.includes(player.userId)) {
                                    player.winAmount = responseData.amount;
                                }
                            });
                            winnerData.playerInfo =
                                yield mutant_1.mutantService.addTenantToPlayerInfo(winnerData.playerInfo);
                            yield socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.ROUND_FINISH_SCOREBOARD, winnerData);
                        }
                    }
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error found from handleSplitAcceptReject: ${error.message}`, [error]);
                return {
                    success: false,
                    error: error.message,
                    data: { tableId: (data === null || data === void 0 ? void 0 : data.tableId) || '' },
                };
            }
            finally {
                try {
                    if (lock && lock instanceof redlock_1.Lock) {
                        yield redlock_2.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in handleSplitAcceptReject; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on handleSplitAcceptReject: `, [err]);
                }
            }
        });
    }
    buildGameDataForSplit(tableData, totalSeats, playersGameData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { _id: tableId, currentRound, gameType } = tableData;
            const roundHistory = yield index_1.turnHistoryService.getTurnHistory(tableId, currentRound - 1);
            const gameDataKafkaPartitionKey = connections_1.zk.getConfig().GAME_DATA_KAFKA_PARTITION_KEY;
            const gameDataKafkaTopic = connections_1.zk.getConfig().GAME_DATA_KAFKA_TOPIC;
            const gameEndReasonMap = {};
            const lobbyDetails = {};
            playersGameData.forEach((player) => {
                if (!player) {
                    throw new Error(`PlayerGamePlay not found, ${tableId}`);
                }
                if (player.userStatus === constants_1.PLAYER_STATE.PLAYING) {
                    roundHistory.winnerId = player.userId; // winner id can be either of all players
                    gameEndReasonMap[player.userId] = constants_1.GAME_END_REASONS.WON;
                    lobbyDetails[String(player.userId)] = tableData.lobbyId;
                }
            });
            const gameData = {
                timestamp: Date.now(),
                key: gameDataKafkaPartitionKey,
                payload: {
                    tableId: `${(0, utils_1.getIdPrefix)(gameType)}-${tableId}`,
                    roundNo: roundHistory.roundNo,
                    finalRound: true,
                    roundId: '',
                    gameData: {
                        startingUsersCount: totalSeats,
                        lobbyId: lobbyDetails,
                        rummyType: tableData.gameType,
                        uniqueId: `${tableId}-${currentRound}`,
                        gameEndReason: gameEndReasonMap,
                        gameDetails: [roundHistory],
                    },
                },
            };
            // kafkaServiceHelper.sendToKafka(
            //   tableData.gameType,
            //   gameDataKafkaTopic,
            //   gameDataKafkaPartitionKey,
            //   gameData,
            // );
        });
    }
    handleSplitAccept(userId, tableConfigData) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(`handleSplitAccept: userId: ${userId}`, [
                tableConfigData,
            ]);
            const { currentRound, _id: tableId } = tableConfigData;
            const tableGamePlayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['splitUserId', 'seats', 'splitCount', 'potValue']);
            if (!tableGamePlayData)
                throw new Error(`TableGamePlayData doesn't exist for tableid ${tableId}`);
            if (tableGamePlayData.tableState === constants_1.TABLE_STATE.PLAY_MORE)
                throw new Error(`Table split already completed for tableid ${tableId}`);
            let { splitUserId } = tableGamePlayData;
            const { seats } = tableGamePlayData;
            if (!splitUserId) {
                tableGamePlayData.splitUserId = userId;
                splitUserId = userId;
            }
            const usersDataPromise = seats.map((seat) => userProfile_1.userProfileService.getUserDetailsById(seat._id));
            const pgpDataPromise = seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, ['userId', 'dealPoint', 'split', 'userStatus', 'points']));
            const usersData = yield Promise.all(usersDataPromise);
            const playersGamePlayData = yield Promise.all(pgpDataPromise);
            const playersInfo = usersData.filter(Boolean);
            const splitUsername = playersInfo.find((p) => p.id === tableGamePlayData.splitUserId).userName;
            const isSplitable = yield this.isTableSplitable(playersGamePlayData, tableConfigData);
            const eliminatedPlayers = isSplitable.eliminatedPlayers.map((ele) => ele.userId);
            if (!(isSplitable && isSplitable.splitType)) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR table is not splitable from handleSplitAccept,
        userId: ${userId}`, [isSplitable, tableConfigData]);
                return null;
            }
            const playerGameData = playersGamePlayData.find((player) => (player === null || player === void 0 ? void 0 : player.userId) === userId);
            if ((playerGameData === null || playerGameData === void 0 ? void 0 : playerGameData.split) !== constants_1.NUMERICAL.ONE) {
                tableGamePlayData.splitCount += 1;
            }
            playerGameData.split = constants_1.NUMERICAL.ONE;
            const playerInfoRes = [];
            isSplitable.playingPlayers.forEach((player) => {
                const { split } = player;
                const splitStatus = this.getSplitStatus(split);
                playerInfoRes.push({
                    userId: player.userId,
                    username: playersInfo.find((p) => p.id === player.userId)
                        .userName,
                    splitStatus,
                    points: player.points,
                    totalPoints: player.dealPoint,
                });
            });
            const perPlayerAmount = tableGamePlayData.potValue / isSplitable.playingPlayers.length;
            const splitAmount = (0, deductRake_1.deductRake)(perPlayerAmount, tableConfigData.rakePercentage);
            newLogger_1.Logger.info(`handleSplitAccept amount: ${splitAmount}, ${perPlayerAmount}, ${tableConfigData.rakePercentage}, ${tableId}`);
            /**
             * saving split data
             */
            yield Promise.all([
                playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGameData),
                tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGamePlayData),
            ]);
            newLogger_1.Logger.info(`handleSplitAccept: splitCount: ${tableGamePlayData.splitCount}, 
      split playing users: `, [isSplitable.playingPlayers, tableId]);
            if (tableGamePlayData.splitCount >=
                isSplitable.playingPlayers.length) {
                // cancelling RTS
                schedulerQueue_1.scheduler.cancelJob.tableStart(tableId);
                schedulerQueue_1.scheduler.cancelJob.roundStart(tableId);
                const sendData = [];
                const battleId = `${constants_1.STRINGS.RPOM}-${tableId}`;
                for (let i = 0; i < isSplitable.playingPlayers.length; i++) {
                    const playerGameDataLocal = isSplitable.playingPlayers[i];
                    const scoreData = {
                        gameEndReason: playerGameDataLocal.userStatus,
                        rummyType: tableConfigData.gameType,
                        lobbyId: tableConfigData.lobbyId,
                        uniqueId: battleId,
                        startingUsersCount: tableGamePlayData.seats.filter((seat) => seat._id).length,
                    };
                    const jsonObject = {
                        requestId: (0, getRandomUUID_1.getRandomUUID)(),
                        battleId,
                        userId: playerGameDataLocal.userId,
                        score: playerGameDataLocal.dealPoint,
                        scoreData: JSON.stringify(scoreData),
                        isFirstScore: false,
                        partnerKey: '',
                        decimalScore: playerGameDataLocal.dealPoint,
                        lobbyId: tableConfigData.lobbyId,
                    };
                    sendData.push(jsonObject);
                }
                // GRPC request
                // const grpcRes = await grpcSplit.splitRequest(
                //   battleId,
                //   tableConfigData.lobbyId,
                //   sendData,
                //   tableConfigData.cgsClusterName,
                // );
                // Logger.info(
                //   `handleSplitAccept: splitRequest response data: `,
                //   grpcRes,
                //   tableId,
                // );
                // if (!grpcRes || grpcRes?.error) {
                //   Logger.error('split grpc error: ', grpcRes, tableId);
                //   return {
                //     tableId,
                //     eliminatedUsers: eliminatedPlayers,
                //     userId: tableGamePlayData.splitUserId,
                //     username: splitUsername,
                //     playerInfo: playerInfoRes,
                //     amount: splitAmount,
                //     result: NUMERICAL.TWO,
                //     currencyType: tableConfigData.currencyType,
                //   };
                // }
                const grpcRes = {};
                yield tableGameplay_1.tableGameplayService.deleteSplitRequest(tableId);
                return {
                    tableId,
                    eliminatedUsers: eliminatedPlayers,
                    userId: tableGamePlayData.splitUserId,
                    username: splitUsername,
                    playerInfo: playerInfoRes,
                    amount: splitAmount,
                    result: constants_1.NUMERICAL.ONE,
                    isSplitable,
                    grpcRes,
                    playersGamePlayData,
                    tableGamePlayData,
                };
            }
            return {
                tableId,
                eliminatedUsers: eliminatedPlayers,
                userId: tableGamePlayData.splitUserId,
                username: splitUsername,
                playerInfo: playerInfoRes,
                amount: splitAmount,
                result: constants_1.NUMERICAL.TWO,
            };
        });
    }
    handleSplitReject(userId, tableConfigData) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(`handleSplitReject: userId: ${userId}`, [
                tableConfigData,
            ]);
            const { currentRound, _id: tableId } = tableConfigData;
            const splitData = yield tableGameplay_1.tableGameplayService.getSplitRequest(tableId);
            if (!splitData) {
                return newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR handleSplitReject: no split in process, userId: ${userId}`, [tableConfigData]);
            }
            const tableGamePlayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['splitUserId', 'seats', 'splitCount', 'potValue']);
            const { seats } = tableGamePlayData;
            const usersDataPromise = seats.map((seat) => userProfile_1.userProfileService.getUserDetailsById(seat._id));
            const pgpDataPromise = seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, ['userId', 'dealPoint', 'split', 'userStatus', 'points']));
            const usersData = yield Promise.all(usersDataPromise);
            const playersGamePlayData = yield Promise.all(pgpDataPromise);
            const playersInfo = usersData.filter(Boolean);
            const splitUsername = playersInfo.find((p) => p.id === tableGamePlayData.splitUserId).userName;
            const isSplitable = yield this.isTableSplitable(playersGamePlayData, tableConfigData);
            const eliminatedPlayers = isSplitable.eliminatedPlayers.map((ele) => ele.userId);
            if (!(isSplitable && isSplitable.splitType)) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR table is not splitable from handleSplitReject,
        userId: ${userId}`, [isSplitable, tableConfigData]);
                return null;
            }
            const playerGameData = playersGamePlayData.find((player) => (player === null || player === void 0 ? void 0 : player.userId) === userId);
            playerGameData.split = constants_1.NUMERICAL.ZERO;
            tableGamePlayData.splitCount -= 1;
            const playerInfoRes = [];
            isSplitable.playingPlayers.forEach((player) => {
                const { split } = player;
                const splitStatus = this.getSplitStatus(split);
                playerInfoRes.push({
                    userId: player.userId,
                    username: playersInfo.find((p) => p.id === player.userId)
                        .userName,
                    splitStatus,
                    totalPoints: player.dealPoint,
                });
            });
            const perPlayerAmount = tableGamePlayData.potValue / isSplitable.playingPlayers.length;
            const splitAmount = (0, deductRake_1.deductRake)(perPlayerAmount, tableConfigData.rakePercentage);
            yield tableGameplay_1.tableGameplayService.deleteSplitRequest(tableId);
            return {
                tableId,
                eliminatedUsers: eliminatedPlayers,
                userId: tableGamePlayData.splitUserId,
                username: splitUsername,
                playerInfo: playerInfoRes,
                amount: splitAmount,
                result: constants_1.NUMERICAL.ZERO,
            };
        });
    }
    isTableSplitable(playersGameData, tableData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { maximumPoints, rebuyUsed } = tableData;
            const { TABLE_MIN_SPLITABLE_POINTS_101, TABLE_MIN_SPLITABLE_POINTS_201, TABLE_MIN_SPLITABLE_POINTS_61, } = connections_1.zk.getConfig();
            let splitMinPoints = TABLE_MIN_SPLITABLE_POINTS_101;
            if (maximumPoints === 201)
                splitMinPoints = TABLE_MIN_SPLITABLE_POINTS_201;
            else if (maximumPoints === 61)
                splitMinPoints = TABLE_MIN_SPLITABLE_POINTS_61;
            let responseObj = null;
            /**
             * checking for manual split
             */
            if (playersGameData.length > 2) {
                responseObj = {};
                let splitEligibilePlayers = [];
                for (let i = 0; i < playersGameData.length; ++i) {
                    const player = playersGameData[i];
                    if (player.dealPoint < maximumPoints &&
                        player.dealPoint >= splitMinPoints) {
                        splitEligibilePlayers.push(player);
                        if (rebuyUsed)
                            responseObj.rejoinTable = true;
                    }
                    else if (player.dealPoint < splitMinPoints) {
                        splitEligibilePlayers = [];
                        break;
                    }
                }
                const eliminatedPlayers = playersGameData.filter((player) => player.dealPoint >= maximumPoints);
                /**
                 * TWO PLAYERS split
                 */
                if (splitEligibilePlayers.length === 2) {
                    responseObj.splitType = constants_1.SPLIT.TWO_PLAYER_SPLIT;
                }
                else if (
                /**
                 * THREE PLAYERS split
                 */
                (playersGameData.length > 3 &&
                    splitEligibilePlayers.length === 3) ||
                    (playersGameData.length === 3 &&
                        responseObj.rejoinTable &&
                        splitEligibilePlayers.length === playersGameData.length))
                    responseObj.splitType = constants_1.SPLIT.THREE_PLAYER_SPLIT;
                responseObj.playingPlayers = splitEligibilePlayers;
                responseObj.eliminatedPlayers = eliminatedPlayers;
            }
            newLogger_1.Logger.info(`isSplitable table: ${tableData._id} >> responseObj: `, [responseObj]);
            return responseObj;
        });
    }
    getSplitStatus(split) {
        // let button = 1; // nothing
        // if (split === 1) button = 0; // accept
        // else if (split === 0) button = 2; // reject
        let splitStatus = constants_1.SPLIT_STATUS.NOT_RESPONDED; // NOT_RESPONDED
        if (split === 1)
            splitStatus = constants_1.SPLIT_STATUS.ACCEPTED; // ACCEPTED
        else if (split === 0)
            splitStatus = constants_1.SPLIT_STATUS.REJECTED; // REJECTED
        return splitStatus;
    }
}
exports.splitHandler = new SplitHandler();
