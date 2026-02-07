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
const newLogger_1 = require("../../newLogger");
const connections_1 = require("../../connections");
const userProfile_1 = require("../../db/userProfile");
const insufficientFund_1 = require("../../utils/insufficientFund");
const events_1 = require("../../state/events");
const events_2 = require("../../constants/events");
class PlayMore {
    send(userId, tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            const userInfo = yield userProfile_1.userProfileService.getUserDetailsById(userId);
            if (!userInfo)
                throw new Error('UserProfile not found');
            // alertPopup.CustomCommonPopup(
            //   userInfo.socketId,
            //   {
            //     content: CONFIG.PLAY_MORE_TEXT,
            //     title: POPUP_TITLES.PLAY_MORE,
            //     textColor: ColorHexCode.WHITE,
            //   },
            //   {
            //     apkVersion: 0,
            //     tableId,
            //     userId: `${userId}`,
            //     error: AlertType.GAME_SERVER_ERROR,
            //   },
            //   [
            //     {
            //       text: 'YES',
            //       action: 'OnClickPlayMoreYes',
            //       color_hex: ColorHexCode.GREEN,
            //       color: Color.GREEN,
            //     },
            //     {
            //       text: 'NO',
            //       action: 'OnClickPlayMoreNo',
            //       color_hex: ColorHexCode.RED,
            //       color: Color.RED,
            //     },
            //   ],
            // );
        });
    }
    checkPlayAgainAndUpsellData(tableId, tableInfo, players, finalDataGrpc, tableConfigData) {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * filter player who can't play new game and set isPlayAgain flag in playerData
             */
            const filterPlayerData = finalDataGrpc.playersData.filter((pd) => !pd.isPlayAgain);
            players.map((player) => {
                player.isPlayAgain = true;
                filterPlayerData.map((insufficientFundPlayer) => {
                    if (player.userId === insufficientFundPlayer.userId) {
                        player.isPlayAgain = false;
                    }
                    return insufficientFundPlayer;
                });
                return player;
            });
            /**
             * filter player who get upsell data and set that data in playerData
             */
            const filterPlayerDataWithUpsell = finalDataGrpc.playersData.filter((pd) => pd.nextSuggestedLobby);
            players.map((player) => {
                player.isPlayWithUpsellData = {};
                filterPlayerDataWithUpsell.map((upsellPlayer) => {
                    if (player.mplId === upsellPlayer.userId) {
                        player.isPlayWithUpsellData =
                            upsellPlayer.nextSuggestedLobby;
                    }
                    return upsellPlayer;
                });
                return player;
            });
            Promise.all([
                this.sendPlayMoreEventToAllPlayers(tableId, tableInfo, players, tableConfigData, 0),
                events_1.eventStateManager.fireEvent(tableId, events_2.STATE_EVENTS.PLAY_MORE),
            ]);
        });
    }
    sendPlayMoreEventToAllPlayers(tableId, tableInfo, playerData, tableConfigData, iteration) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = connections_1.zk.getConfig();
            const players = playerData;
            if (config.PLAYMORE) {
                if (iteration < players.length) {
                    if (!players[iteration].isPlayAgain) {
                        newLogger_1.Logger.info(`sendPlayMoreEventToAllPlayers: sendInsufficientFundEvent for table: ${tableId}`, [players[iteration], tableConfigData]);
                        yield (0, insufficientFund_1.sendInsufficientFundEvent)(players[iteration].userId, tableId);
                        this.sendPlayMoreEventToAllPlayers(tableId, tableInfo, players, tableConfigData, iteration + 1);
                    }
                    else {
                        newLogger_1.Logger.info(`sendPlayMoreEventToAllPlayers: else >>`);
                        yield this.send(players[iteration].userId, tableId);
                        this.sendPlayMoreEventToAllPlayers(tableId, tableInfo, players, tableConfigData, iteration + 1);
                    }
                }
                else {
                    const playersInfoPromise = tableInfo.seats.map((seat) => userProfile_1.userProfileService.getUserDetailsById(seat._id));
                    const playersInfo = yield Promise.all(playersInfoPromise);
                    playersInfo.forEach((player) => {
                        if (player) {
                            player.tableIds = player.tableIds.filter((t_id) => t_id !== tableId);
                            userProfile_1.userProfileService.setUserDetails(player.id, player);
                        }
                    });
                }
                // else {
                //   setTimeout(() => {
                //     Lib.Round.dumpGame(tableData._id);
                //   }, Lib.CONSTANTS.NUMERICAL.SIXTY * Lib.CONSTANTS.NUMERICAL.TEN_THOUSAND);
                //   Logger.debug('PlayMore Timer started ----------------');
                //   const timer = config.PLAYMORE_POP_TIMER * NUMERICAL.THOUSAND;
                //   const { currentRound } = tableConfigData;
                //   const jobId = `${tableConfigData._id}-${currentRound}`;
                //   Lib.Scheduler.addJob.playMoreTimer({
                //     timer,
                //     jobId,
                //     players,
                //     tableConfigData,
                //   });
                // }
            }
            else {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR playe more is false in config >>> `);
                /**
                 * remove all users recursively
                 */
                // for await (const singlePlayer of players) {
                //   /**
                //    * send exit event to close the play more popup and redirect into react
                //    */
                //   sendExitEvent(singlePlayer.userObjectId);
                // }
            }
        });
    }
}
module.exports = new PlayMore();
