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
exports.seatShuffle = void 0;
const newLogger_1 = require("../../newLogger");
const constants_1 = require("../../constants");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const playerGameplay_1 = require("../../db/playerGameplay");
function seatShuffle(tableId, currentRound, tableGamePlayData, eliminatedPlayers, isTableRejoinable, scoreBoardData) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            newLogger_1.Logger.info(`seatShuffle for table: ${tableId}:${currentRound}`);
            if (!((_a = tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.seats) === null || _a === void 0 ? void 0 : _a.length)) {
                throw new Error(`tableGameplayData|seats not found for table: ${tableId}:${currentRound} from seatShuffle`);
            }
            const playersInfo = (yield Promise.all(tableGamePlayData.seats.map((seat) => __awaiter(this, void 0, void 0, function* () {
                const exists = eliminatedPlayers.find((player) => player.userId === seat._id &&
                    (player.userStatus === constants_1.PLAYER_STATE.LEFT ||
                        !isTableRejoinable));
                if (exists) {
                    return;
                }
                const playerInfo = scoreBoardData.playerInfo.find((p) => p.userId === seat._id);
                const userInfo = yield userProfile_1.userProfileService.getUserDetailsById(playerInfo.userId);
                if (!userInfo) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR seatShuffle: userInfo not found for user: ${playerInfo.userId}`);
                }
                playerInfo.username = userInfo === null || userInfo === void 0 ? void 0 : userInfo.userName;
                playerInfo.profilePicture = userInfo === null || userInfo === void 0 ? void 0 : userInfo.avatarUrl;
                playerInfo.seatIndex = seat.seat;
                playerInfo.status = constants_1.PLAYER_STATE.PLAYING;
                playerInfo.tenant = userInfo === null || userInfo === void 0 ? void 0 : userInfo.tenant;
                yield playerGameplay_1.playerGameplayService.setPlayerGameplay(playerInfo.userId, tableId, currentRound, { seatIndex: seat.seat });
                const { userId, username, profilePicture, seatIndex, status, totalPoints, tenant, } = playerInfo;
                return {
                    userId,
                    username,
                    profilePicture,
                    seatIndex,
                    status,
                    totalPoints,
                    tenant,
                };
            })))).filter(Boolean);
            const responseData = {
                tableId,
                shuffleSeats: true,
                playerInfo: playersInfo,
                toastMessage: '',
                currentRound: currentRound + 1,
            };
            newLogger_1.Logger.info(`seat shuffle room event data for table: ${tableId}:${currentRound}`, [responseData]);
            socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.SEAT_SHUFFLE, responseData);
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error from seatShuffle table: ${tableId}:${currentRound},
      error: ${error.message}`, [error]);
        }
    });
}
exports.seatShuffle = seatShuffle;
