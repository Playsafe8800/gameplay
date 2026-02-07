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
exports.dumpGameHelper = void 0;
const newLogger_1 = require("../../newLogger");
const index_1 = require("../../db/playerGameplay/index");
const index_2 = require("../../db/roundScoreBoard/index");
const index_3 = require("../../db/tableConfiguration/index");
const index_4 = require("../../db/tableGameplay/index");
const index_5 = require("../../db/userProfile/index");
const index_6 = require("../schedulerQueue/index");
class DumpGame {
    dumpGame(tableId, isFinalRound) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.debug(`dumpGame started :- ${tableId}`);
                // UserService.cancelBattle(tableId);
                const tableConfig = yield index_3.tableConfigurationService.getTableConfiguration(tableId, ['currentRound']);
                newLogger_1.Logger.debug(`dumpGame: tableConfig: `, tableConfig);
                if (tableConfig && tableConfig.currentRound) {
                    const { currentRound } = tableConfig;
                    const totalRound = Array.from(Array(currentRound).keys()).map((e) => e + 1);
                    const tableGamePlay = yield index_4.tableGameplayService.getTableGameplay(tableId, currentRound, ['seats']);
                    newLogger_1.Logger.debug(`dumpGame: ${tableId}, TGP: `, tableGamePlay);
                    yield Promise.all([
                        totalRound.map((roundNumber) => {
                            index_2.roundScoreBoardService.deleteRoundScoreBoard(tableId, roundNumber),
                                index_4.tableGameplayService.deleteTableGameplay(tableId, roundNumber);
                            return true;
                        }),
                        index_3.tableConfigurationService.deleteTableConfiguration(tableId),
                    ]);
                    if (tableGamePlay &&
                        tableGamePlay.seats &&
                        tableGamePlay.seats.length) {
                        newLogger_1.Logger.debug(`dumpGame: ${tableId}, seats: `, tableGamePlay.seats);
                        const seats = tableGamePlay.seats.filter((ele) => ele._id);
                        const userIds = seats.map((e) => e._id);
                        if (isFinalRound) {
                            userIds.forEach((userId) => {
                                newLogger_1.Logger.debug(`cancelling job for user : - ${userId}  for table ${tableId}`);
                                index_6.scheduler.cancelJob.playerTurnTimer(tableId, userId);
                                index_6.scheduler.cancelJob.finishTimer(tableId, currentRound);
                            });
                        }
                        const playerGamePlays = [];
                        const userProfiles = [];
                        for (let i = 0; i < userIds.length; i++) {
                            const userId = userIds[i];
                            for (let j = 1; j < totalRound.length + 1; j++) {
                                playerGamePlays.push(index_1.playerGameplayService.deletePlayerGamePlay(userId, tableId, currentRound));
                                userProfiles.push(index_5.userProfileService.removeTableIdFromProfile(userId, tableId));
                            }
                        }
                        yield Promise.all(playerGamePlays);
                        yield Promise.all(userProfiles);
                        newLogger_1.Logger.debug(`dump table ended :- ${tableId}`);
                    }
                }
                return true;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR dumpGame: for table `, [error]);
                return false;
            }
        });
    }
}
exports.dumpGameHelper = new DumpGame();
