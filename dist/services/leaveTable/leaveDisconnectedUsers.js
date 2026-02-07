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
exports.leaveDisconnectedUsers = void 0;
const newLogger_1 = require("../../newLogger");
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableGameplay_1 = require("../../db/tableGameplay");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const errors_1 = require("../../utils/errors");
const cancelBattle_1 = require("../gameplay/cancelBattle");
function leaveDisconnectedUsers(tableId, currentRound) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            newLogger_1.Logger.info(`leaveDisconnectedUsers => tableId ${tableId}; currentRound ${currentRound} `);
            const tableGamePlayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['seats']);
            newLogger_1.Logger.info(`leaveDisconnectedUsers ${tableId}:${currentRound} TGP`, [tableGamePlayData]);
            if (!tableGamePlayData) {
                throw new Error(`leaveDisconnectedUsers: 
        TableGamePlay not found, ${tableId}:${currentRound}`);
            }
            const LeaveTableHandler = (yield Promise.resolve().then(() => __importStar(require('../../services/leaveTable')))).default;
            tableGamePlayData.seats.forEach((seat) => __awaiter(this, void 0, void 0, function* () {
                const [playerGamePlayData, userProfileData] = yield Promise.all([
                    playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, ['userStatus']),
                    userProfile_1.userProfileService.getUserDetailsById(seat._id),
                ]);
                newLogger_1.Logger.info(`leaveDisconnectedUsers ${tableId}: ${seat._id} PGP`, [playerGamePlayData, `userProfileData: `, userProfileData]);
                if (!userProfileData ||
                    !playerGamePlayData ||
                    (playerGamePlayData === null || playerGamePlayData === void 0 ? void 0 : playerGamePlayData.userStatus) === constants_1.PLAYER_STATE.LEFT)
                    return;
                const socketInfo = yield socketOperation_1.socketOperation.getSocketFromSocketId(userProfileData === null || userProfileData === void 0 ? void 0 : userProfileData.socketId);
                if (socketInfo)
                    return;
                LeaveTableHandler.main({
                    tableId,
                    reason: constants_1.LEAVE_TABLE_REASONS.DISCONNECTED_BEFORE_GAME_START,
                }, seat._id);
            }));
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR _CATCH_ERROR_: Error from leaveDisconnectedUsers: `, [error]);
            if (error instanceof errors_1.CancelBattleError) {
                cancelBattle_1.cancelBattle.cancelBattle(tableId, error);
                return;
            }
            return undefined;
        }
    });
}
exports.leaveDisconnectedUsers = leaveDisconnectedUsers;
