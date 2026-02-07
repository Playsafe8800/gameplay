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
exports.userPlayedGame = void 0;
const baseTable_1 = require("./baseTable");
const playerState_1 = require("../constants/playerState");
const index_1 = require("../constants/index");
const newLogger_1 = require("../newLogger");
const index_2 = require("../utils/index");
function userPlayedGame(playersGameData, userId, playersInfoData, tableData, tableGamePlay, playerGamePlay, winnerId, userAppData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const opponenets = playersGameData.filter((e) => e.userId !== userId);
            const opponentsUserId = opponenets
                .map((e) => `${e.userId}`)
                .join();
            const opponentsDisplayName = playersInfoData
                .map((e) => (e === null || e === void 0 ? void 0 : e.id) !== userId && (e === null || e === void 0 ? void 0 : e.userName))
                .filter(Boolean)
                .join();
            const opponentsStatus = opponenets
                .map((e) => `${e.userStatus}`)
                .join();
            const tableObject = (0, baseTable_1.baseTable)(tableData, tableGamePlay, userId);
            if (userAppData) {
                (0, baseTable_1.baseAppData)(userAppData, tableObject);
            }
            let dropVal = 0;
            let middleDropVal = 0;
            if (playerGamePlay.userStatus === playerState_1.PLAYER_STATE.DROP &&
                (playerGamePlay.points === index_1.POINTS.FIRST_DROP ||
                    playerGamePlay.points === index_1.POINTS.FIRST_DROP_201)) {
                dropVal = playerGamePlay.points;
            }
            else if (playerGamePlay.userStatus === playerState_1.PLAYER_STATE.DROP &&
                (playerGamePlay.points === index_1.POINTS.MIDDLE_DROP ||
                    playerGamePlay.points === index_1.POINTS.MIDDLE_DROP_201)) {
                middleDropVal = playerGamePlay.points;
            }
            tableObject['Is Won'] = winnerId === userId;
            tableObject['Game End Reason'] = (0, index_2.getRoundEndReason)(playerGamePlay, winnerId);
            tableObject['Game Score'] = tableGamePlay.totalPlayerPoints;
            tableObject['Drop Value'] = dropVal;
            tableObject['Middle Drop Value'] = middleDropVal;
            tableObject['Game Score'] = playerGamePlay.dealPoint;
            tableObject['Players Count'] = tableGamePlay.seats.length;
            tableObject['Opponent User ID'] = opponentsUserId;
            tableObject['Opponent Display Name'] = opponentsDisplayName;
            tableObject['Opponent Status'] = opponentsStatus;
            tableObject['Round Number'] = tableData.currentRound;
            // const sendEventData = {
            //   key: INSTRUMENTATION_EVENTS.USER_PLAYED_GAME,
            //   timestamp: new Date().getTime(),
            //   payload: tableObject,
            // };
            // Logger.info(
            //   'Instrumentation: userPlayedGame request ',
            //   sendEventData,
            // );
            // await grpcInstrumentation.sendInstrumentation(
            //   sendEventData,
            //   tableData.gameType,
            //   tableData.cgsClusterName,
            // );
            return tableObject;
        }
        catch (error) {
            // @ts-ignore
            newLogger_1.Logger.error('INTERNAL_SERVER_ERROR CATCH_ERROR:', [
                'userPlayedGame',
                error.message,
                error,
            ]);
            return false;
        }
    });
}
exports.userPlayedGame = userPlayedGame;
