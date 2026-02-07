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
Object.defineProperty(exports, "__esModule", { value: true });
exports.switchTable = void 0;
const newLogger_1 = require("../../newLogger");
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const errors_1 = require("../../utils/errors");
const cancelBattle_1 = require("../gameplay/cancelBattle");
const addTable_1 = require("../signUp/addTable");
const insertPlayerInNewTable = (currentTableId, userId, socket, tableSessionId = '') => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [tabledataInfo, userProfile] = yield Promise.all([
            tableConfiguration_1.tableConfigurationService.getTableConfiguration(currentTableId, ['lobbyId']),
            userProfile_1.userProfileService.getUserDetailsById(userId),
        ]);
        newLogger_1.Logger.info(`== User ${userId} InsertPlayerInNewTable after leave table for switchTable call old table: ${currentTableId} ==> `, [userProfile]);
        const gtiData = yield (0, addTable_1.addTable)({
            lobbyId: tabledataInfo.lobbyId,
            connectionType: constants_1.CONNECTION_TYPE.ADD_TABLE,
            tableSessionId,
            unitySessionId: userProfile.unitySessionId,
        }, socket);
        newLogger_1.Logger.info(`switchTable: after addTable: oldTableId: ${currentTableId}`, [gtiData]);
        const [response] = gtiData.gameTableInfoData;
        if (response) {
            response.referenceTableId = currentTableId;
            socketOperation_1.socketOperation.sendEventToClient(socket, response, constants_1.EVENTS.SWITCH_TABLE_GTI_SOCKET_EVENT);
            return response;
        }
        else
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR switch table new GTI response undefined: lastTableId: ${currentTableId}`);
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR _CATCH_ERROR_: Error from insertPlayerInNewTable: ${error}`, [error]);
        if (error instanceof errors_1.CancelBattleError) {
            yield cancelBattle_1.cancelBattle.cancelBattle(currentTableId, error);
        }
    }
});
function switchTable(data, socket) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId, tableId, isDropNSwitch } = data;
            const tableInfo = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                'currentRound',
            ]);
            const { currentRound } = tableInfo;
            // get before leavetable because during waiting/roundTimer it will be destroyed
            const playerGamePlayInfo = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, ['tableSessionId']);
            const LeaveTableHandler = (yield Promise.resolve().then(() => __importStar(require('../../services/leaveTable')))).default;
            const leaveTableSuccess = yield LeaveTableHandler.main({
                tableId,
                reason: constants_1.LEAVE_TABLE_REASONS.SWITCH,
                isDropNSwitch,
            }, userId);
            if (leaveTableSuccess === null || leaveTableSuccess === void 0 ? void 0 : leaveTableSuccess.exit) {
                const pgp = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, ['isPlayAgain']);
                if (pgp && !pgp.isPlayAgain) {
                    const userInfo = yield userProfile_1.userProfileService.getUserDetailsById(userId);
                    if (!userInfo) {
                        throw new Error(`UserDetails not found for: ${userId}`);
                    }
                    // const grpcRes = await grpcBattle.sendFinishUserSession({
                    //   sessionId: playerGamePlayInfo?.tableSessionId, // userProfile.unitySessionId,
                    //   userId,
                    //   lobbyId: tableInfo.lobbyId,
                    // });
                    // Logger.info(
                    //   `finishSessionGRPCCall in switchTable for userId: ${userInfo.id} -
                    //     sessionId: ${playerGamePlayInfo?.tableSessionId} - ${userProfile.unitySessionId} -
                    //     lobbyId: ${tableInfo.lobbyId}`,
                    //   grpcRes,
                    // );
                    newLogger_1.Logger.info(`User ${userId} has not valid amount, 
            hence not finding any new table after switchTable ${tableId}`, [pgp]);
                    return false;
                }
                newLogger_1.Logger.info(`== PGP for user ${userId} on previous table ${tableId} after leave table ==`, [pgp]);
                newLogger_1.Logger.info(`=== user ${userId} leave Table from ${tableId} success, Inserting player in a new table ===`);
                const resData = yield insertPlayerInNewTable(tableId, userId, socket, playerGamePlayInfo === null || playerGamePlayInfo === void 0 ? void 0 : playerGamePlayInfo.tableSessionId);
                return resData;
            }
            else {
                newLogger_1.Logger.info(`user ${userId} Leave Table from ${tableId} Failed`);
            }
            return { success: true, error: null, tableId };
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR _CATCH_ERROR_:  from switch table:  on table ${data === null || data === void 0 ? void 0 : data.tableId}`, [error]);
            if (error instanceof errors_1.CancelBattleError) {
                yield cancelBattle_1.cancelBattle.cancelBattle(data === null || data === void 0 ? void 0 : data.tableId, error);
            }
            throw error;
        }
    });
}
exports.switchTable = switchTable;
