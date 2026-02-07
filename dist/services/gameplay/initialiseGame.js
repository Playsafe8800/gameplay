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
exports.initializeGame = void 0;
const newLogger_1 = require("../../newLogger");
const underscore_1 = __importDefault(require("underscore"));
const connections_1 = require("../../connections");
const index_1 = require("../../db/playerGameplay/index");
const removeOnGrpcSuccessFalse_1 = require("../../utils/removeOnGrpcSuccessFalse");
const userService_1 = __importDefault(require("../../userService"));
const constants_1 = require("../../constants");
class InitialiseGame {
    createBattle(tableId, playingUsers, tableConfigData) {
        return __awaiter(this, void 0, void 0, function* () {
            let grpcRes;
            const userIds = underscore_1.default.compact(playingUsers).map((e) => {
                return e['playingUser'].userId;
            });
            try {
                newLogger_1.Logger.info(`create battle ${tableId} > sessionIds >> `, {
                    usersId: userIds,
                    lobbyId: tableConfigData.lobbyId,
                    matchId: tableId,
                });
                grpcRes = yield userService_1.default.createBattle(userIds, tableConfigData.lobbyId, tableId);
                newLogger_1.Logger.info(`create battle response ${tableId} > sessionIds >> `, [grpcRes]);
                if (grpcRes && grpcRes.status) {
                    return {
                        tableGameData: {
                            seats: playingUsers.map((user) => ({
                                _id: user['playingUser']._id,
                                seat: user['playingUser'].seat,
                                seatIndex: user['playingUser'].seat,
                            })),
                        },
                    };
                }
                else {
                    return false;
                }
            }
            catch (error) {
                yield this.removeInsuficientFundUser(userIds, tableConfigData, grpcRes);
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR Error in createBattle func ', [error]);
                throw error;
            }
        });
    }
    removeInsuficientFundUser(userIds, tableConfigData, grpcRes) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`removeInsuficientFundUser: ${tableConfigData._id}`, [grpcRes, userIds]);
                const errMsg = connections_1.zk.getConfig().GSDM;
                const lbPlayingUsers = (yield Promise.all(userIds.map((userId) => {
                    return index_1.playerGameplayService.getPlayerGameplay(userId, tableConfigData._id, tableConfigData.currentRound, ['userId']);
                }))).filter(Boolean);
                newLogger_1.Logger.info(`lbPlayingUser >>>>`, [tableConfigData._id, lbPlayingUsers]);
                yield (0, removeOnGrpcSuccessFalse_1.removeOnGrpcSuccessFalse)(tableConfigData, lbPlayingUsers, errMsg, constants_1.LEAVE_TABLE_REASONS.NO_BALANCE);
                return true;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR on removeInsuficientFundUser: ${tableConfigData}`, [
                    error.message,
                    tableConfigData,
                    error,
                ]);
            }
        });
    }
}
exports.initializeGame = new InitialiseGame();
