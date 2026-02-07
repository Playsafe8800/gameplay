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
const index_1 = require("../../centralLibrary/index");
const enums_1 = require("../../centralLibrary/enums");
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const connections_1 = require("../../connections");
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const date_1 = require("../../utils/date");
const redlock_2 = require("../../utils/lock/redlock");
const response_validator_1 = require("../../validators/response.validator");
const leaveTable_1 = __importDefault(require("../leaveTable"));
const tableOperation_1 = require("../signUp/tableOperation");
class RebuyHandler {
    rebuyPopup(data, socket) {
        return __awaiter(this, void 0, void 0, function* () {
            const { tableId } = data;
            try {
                const tableConfigurationData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, ['bootValue', 'currentRound']);
                const { currentRound } = tableConfigurationData;
                const tableGameplayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['tableState']);
                if (!tableGameplayData) {
                    throw Error(`TGP for table ${tableId}-${currentRound} not found from rebuy`);
                }
                const isTableOpen = tableGameplayData.tableState ===
                    constants_1.TABLE_STATE.ROUND_TIMER_STARTED ||
                    tableGameplayData.tableState ===
                        constants_1.TABLE_STATE.WAITING_FOR_PLAYERS;
                const { REBUY_POPUP_TEXT, REBUY_INVALID_POPUP } = connections_1.zk.getConfig();
                const rebuyPopupAckRes = {
                    tableId,
                    seconds: date_1.dateUtils.addEpochTimeInSeconds(constants_1.NUMERICAL.ZERO),
                    message: REBUY_INVALID_POPUP,
                };
                if (isTableOpen) {
                    rebuyPopupAckRes.message = REBUY_POPUP_TEXT.replace('#20', `#${tableConfigurationData.bootValue}`);
                    rebuyPopupAckRes.seconds = date_1.dateUtils.addEpochTimeInSeconds(constants_1.NUMERICAL.FIFTEEN);
                }
                return rebuyPopupAckRes;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Found error on rebuyPopup for user: ${socket.userId}: table: ${tableId}, ${error.message}`, [error]);
                return { success: false, tableId, seconds: '', message: '' };
            }
        });
    }
    rebuyTable(data, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { action, tableId } = data;
            let lock;
            try {
                lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 2000);
                newLogger_1.Logger.info(`Lock acquired, in rebuyTable resource:, ${lock.resource}`);
                if (action)
                    yield this.handleRebuyAccept(tableId, userId);
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR rejoinTable table ${tableId} user ${userId}, ${error.message}`, [error]);
            }
            finally {
                try {
                    if (lock && lock instanceof redlock_1.Lock) {
                        yield redlock_2.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in rebuyTable; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on rebuyTable: ${err}`, err);
                }
            }
        });
    }
    handleRebuyAccept(tableId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableConfigurationData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                'currentRound',
                'maximumPoints',
                'bootValue',
            ]);
            const { currentRound, maximumPoints } = tableConfigurationData;
            const tableGameplayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['potValue', 'rebuyableUsers', 'tableState', 'seats']);
            if (!tableGameplayData) {
                throw Error(`TGP for table ${tableId}-${currentRound} not found from rebuy`);
            }
            const { tableState, seats } = tableGameplayData;
            const isTableOpen = tableState === constants_1.TABLE_STATE.WAITING_FOR_PLAYERS ||
                tableState === constants_1.TABLE_STATE.ROUND_TIMER_STARTED;
            newLogger_1.Logger.debug(`handleRebuyAccept: isTableOpen ${isTableOpen}`);
            if (!isTableOpen)
                return;
            let pgps = yield Promise.all(seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, ['userId', 'dealPoint', 'networkParams', 'tableSessionId'])));
            pgps = pgps.filter(Boolean);
            const playerGamePlays = pgps;
            const currentPlayerGameplay = playerGamePlays.find((e) => (e === null || e === void 0 ? void 0 : e.userId) === userId);
            if (!currentPlayerGameplay)
                throw new Error(`handleRebuyAccept: PlayerGamePlay not found user: ${userId}, 
        table: ${tableId}-${currentRound}`);
            const maximumPointsPlayer = this.playerMaxPoints(playerGamePlays, maximumPoints, userId);
            const isUserEliminated = currentPlayerGameplay.dealPoint >= maximumPoints;
            const dealPoints = this.getMaximumPoints(maximumPointsPlayer, maximumPoints);
            newLogger_1.Logger.info(`rebuy request isTableOpen ${isTableOpen} isUserEliminated ${isUserEliminated} dealPoints ${dealPoints}`);
            // rebuy condition
            if (isTableOpen && isUserEliminated && dealPoints) {
                newLogger_1.Logger.info(`rebuy request valid for user: ${userId}, table: ${tableId}-${currentRound}`);
                const userInfo = yield userProfile_1.userProfileService.getUserDetailsById(userId);
                if (!userInfo) {
                    throw new Error(`handleRebuyAccept: UserProfile not found user: ${userId}, 
        table: ${tableId}-${currentRound}`);
                }
                const seatIndex = tableOperation_1.tableOperation.insertPlayerInSeat(seats, userId, userInfo.isBot);
                const newPlayerGamePlay = playerGameplay_1.playerGameplayService.getDefaultPlayerGameplayData(userId, seatIndex, dealPoints, true, // useRebuy
                currentPlayerGameplay.networkParams, currentPlayerGameplay.tableSessionId);
                // GRPC request
                // const grpcResponse = await grpcRebuy.rebuyRequest(
                //   tableId,
                //   userId,
                //   lobbyId,
                //   tableConfigurationData.cgsClusterName,
                // );
                // ERROR
                // if (grpcResponse?.error) {
                //   this.handleGrpcError(
                //     grpcResponse,
                //     tableId,
                //     userId,
                //     userInfo.socketId,
                //   );
                //   return;
                // }
                // Success,
                // if (grpcResponse?.isSuccess) {
                tableGameplayData.potValue += tableConfigurationData.bootValue;
                if ((tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.rebuyableUsers) &&
                    tableGameplayData.rebuyableUsers.length > 0) {
                    tableGameplayData.rebuyableUsers =
                        tableGameplayData.rebuyableUsers.filter((id) => id != userId);
                }
                // it will be used for split
                tableConfigurationData.rebuyUsed = true;
                yield Promise.all([
                    playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, newPlayerGamePlay),
                    tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameplayData),
                ]);
                const rebuyActionRes = {
                    tableId,
                    userId,
                    username: userInfo.userName,
                    avatarUrl: userInfo.avatarUrl,
                    seatIndex,
                    totalPoints: newPlayerGamePlay.dealPoint,
                    totalBootValue: tableGameplayData.potValue,
                    status: newPlayerGamePlay.userStatus,
                    tenant: userInfo.tenant,
                };
                (0, response_validator_1.validateRebuyActionRes)(rebuyActionRes);
                socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.REBUY_ACTION, rebuyActionRes);
                // }
            }
        });
    }
    handleGrpcError(grpcResponse, tableId, userId, socketId) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR rebuy handleGrpcError table ${tableId} user ${userId} socketId ${socketId}  `, [grpcResponse]);
        leaveTable_1.default.main({
            reason: constants_1.LEAVE_TABLE_REASONS.GRPC_FAILED,
            tableId,
        }, userId);
        let erorrMsg = connections_1.zk.getConfig().ERRM;
        let erorrTitle = constants_1.POPUP_TITLES.ALERT;
        if (grpcResponse.error.reason === constants_1.GRPC_ERRORS.INSUFFICIENT_FUNDS) {
            erorrMsg = connections_1.zk.getConfig().IMWPM;
            erorrTitle = constants_1.POPUP_TITLES.INSUFFICIENT_FUND;
        }
        this.sendPopUp(tableId, userId, socketId, erorrMsg, erorrTitle);
    }
    sendPopUp(tableId, userId, socketId, content, title) {
        index_1.alertPopup.CustomCommonPopup(socketId, {
            content,
            title,
            textColor: enums_1.ColorHexCode.WHITE,
        }, {
            apkVersion: 0,
            tableId,
            userId: `${userId}`,
            error: enums_1.AlertType.INSUFFICIENT_FUND,
        }, [
            {
                text: 'EXIT',
                action: enums_1.ButtonAction.GOTOLOBBY,
                color_hex: enums_1.ColorHexCode.RED,
                color: enums_1.Color.RED,
            },
        ]);
    }
    playerMaxPoints(playerGamePlays, tableMaxPoint, userId) {
        let maximumPoints = -Infinity;
        for (let i = 0; i < playerGamePlays.length; i++) {
            const playerGame = playerGamePlays[i];
            if (playerGame.dealPoint < tableMaxPoint &&
                playerGame.dealPoint > maximumPoints &&
                playerGame.userId !== userId) {
                maximumPoints = playerGame.dealPoint;
            }
        }
        return maximumPoints;
    }
    getMaximumPoints(maxPoints, tableMaxPoint) {
        if (tableMaxPoint === constants_1.POOL_TYPES.TWO_ZERO_ONE &&
            maxPoints <= constants_1.REJOIN_POINTS.HUNDRED_SEVENTY_FOUR) {
            return maxPoints + 1;
        }
        if (maxPoints <= constants_1.REJOIN_POINTS.SEVENTY_NINE) {
            return maxPoints + 1;
        }
        return 0;
    }
}
module.exports = new RebuyHandler();
