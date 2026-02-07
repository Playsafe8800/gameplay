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
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const newLogger_1 = require("../../newLogger");
const constants_1 = require("../../constants");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const userService_1 = __importDefault(require("../../userService"));
class UserService {
    findOrCreateUser(userId, socketId, socketHeaders, appType, unitySessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get user data from GRPC
            const userData = yield userProfile_1.userProfileService.getOrCreateUserDetailsById(userId, socketId, socketHeaders, unitySessionId, appType);
            return userData;
        });
    }
    debitValidation(tableId, lobbyId, newUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('debitValidation for tableId on new userId: ', [
                    tableId,
                    newUserId,
                ]);
                const tableData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, ["currentRound"]);
                const { currentRound, cgsClusterName } = tableData;
                const tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ["seats"]);
                if (!tableGameData) {
                    throw new Error('tableGameData not found while debitValidation');
                }
                const filteredSeats = tableGameData.seats.filter((seat) => seat._id);
                const userIds = filteredSeats.map((seat) => seat._id);
                userIds.push(newUserId);
                const LeaveTableHandler = (yield Promise.resolve().then(() => __importStar(require('../../services/leaveTable')))).default;
                // userIds.map(async (userId: number) => {
                // const res = await grpcUserDetails.verifyPlayerEligibility({
                //   userId: userId,
                //   lobbyId,
                //   activeTableDetails: {
                //     activeTableId: '',
                //     activeTablePresent: false,
                //   },
                //   flowType: '',
                //   cgsClusterName,
                // });
                // if (res && !res.playerEligible) {
                //   await sendInsufficientFundEvent(userId, tableId);
                //   await LeaveTableHandler.main(
                //     {
                //       reason: LEAVE_TABLE_REASONS.DEBIT_VALIDATION_FAILED,
                //       tableId,
                //     },
                //     userId,
                //   );
                // }
                // if (res && res.error) {
                //   Logger.info(
                //     'INTERNAL_SERVER_ERROR checkPlayerEligibility error for userId: ',
                //     userId,
                //     res.error,
                //   );
                // }
                // });
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR debitValidation catch block error: ', [error]);
                throw error;
            }
        });
    }
    getUserBalance(userId, socket, token, ack) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!userId)
                    throw new Error('userId required for getUserBalance');
                if (!token) {
                    const profileData = yield userProfile_1.userProfileService.getUserDetailsById(userId);
                    if (profileData === null || profileData === void 0 ? void 0 : profileData.token)
                        token = profileData === null || profileData === void 0 ? void 0 : profileData.token;
                }
                if (token) {
                    const userBalanceRes = yield userService_1.default.getUserWallet(token);
                    const totalBalance = (userBalanceRes === null || userBalanceRes === void 0 ? void 0 : userBalanceRes.depositBalance) +
                        (userBalanceRes === null || userBalanceRes === void 0 ? void 0 : userBalanceRes.winningBalance);
                    const response = {
                        depositBalance: userBalanceRes === null || userBalanceRes === void 0 ? void 0 : userBalanceRes.depositBalance,
                        bonusBalance: userBalanceRes === null || userBalanceRes === void 0 ? void 0 : userBalanceRes.bonusBalance,
                        winningBalance: userBalanceRes === null || userBalanceRes === void 0 ? void 0 : userBalanceRes.winningBalance,
                        withDrawableBalance: userBalanceRes === null || userBalanceRes === void 0 ? void 0 : userBalanceRes.winningBalance,
                        pointsWalletBalance: 100,
                        totalBalance,
                        totalDummyBalance: 1210,
                        success: true,
                    };
                    if (ack)
                        return response;
                    yield socketOperation_1.socketOperation.sendEventToClient(socket, response, constants_1.EVENTS.USER_BALANCE_SOCKET_EVENT);
                }
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR getUserBalance catch block error: ', [error]);
                const response = {
                    success: false,
                    error: error,
                };
                return response;
            }
        });
    }
}
exports.userService = new UserService();
