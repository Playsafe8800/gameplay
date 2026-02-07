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
exports.cancelBattle = void 0;
const newLogger_1 = require("../../newLogger");
const connections_1 = require("../../connections");
const index_1 = require("../../db/tableConfiguration/index");
const index_2 = require("../../db/tableGameplay/index");
const index_3 = require("../../db/userProfile/index");
const errors_1 = require("../../utils/errors");
const dumpGame_1 = require("./dumpGame");
class CancelBattle {
    cancelBattle(tableId, cancelBattle) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`cancelling battle of table: ${tableId}`, cancelBattle);
                const tableConfig = yield index_1.tableConfigurationService.getTableConfiguration(tableId, ['currentRound',
                    'gameType']);
                // // @ts-ignore
                // Logger.info(
                //   tableConfig,
                //   '  tableConfig data for table :-',
                //   tableId,
                // );
                const { currentRound } = tableConfig;
                const tableGamePlay = yield index_2.tableGameplayService.getTableGameplay(tableId, currentRound, ["seats"]);
                // Logger.info(
                //   tableGamePlay,
                //   '  tableGamePlay data for table :-',
                //   tableId,
                // );
                if ((_a = tableGamePlay === null || tableGamePlay === void 0 ? void 0 : tableGamePlay.seats) === null || _a === void 0 ? void 0 : _a.length) {
                    const userIds = tableGamePlay.seats
                        .map((e) => e._id)
                        .filter(Boolean);
                    const userProfiles = yield Promise.all(userIds.map((uId) => {
                        return index_3.userProfileService.getUserDetailsById(uId);
                    }));
                    // Logger.info(
                    //   userProfiles,
                    //   '  userProfiles for table :- ',
                    //   tableId,
                    // );
                    if (cancelBattle instanceof errors_1.CancelBattleError) {
                        yield this.sendCancelBattlePopup(tableId, userProfiles);
                        // grpc cancel battle call
                        const cancellationDetails = {
                            source: tableConfig.gameType,
                            reason: cancelBattle.message,
                            reasonType: 'DATA_CORRUPTION', // proto based limitation
                        };
                        // await grpcBattle.sendCancelBattle(
                        //   tableId,
                        //   lobbyId,
                        //   cancellationDetails,
                        //   tableConfig.gameType,
                        //   tableConfig.cgsClusterName,
                        //   tableConfig.currentRound,
                        // );
                    }
                }
                yield dumpGame_1.dumpGameHelper.dumpGame(tableId, true);
                return true;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR on cancelBattle: table: ${tableId}`, [
                    cancelBattle,
                    error
                ]);
                return false;
            }
        });
    }
    sendCancelBattlePopup(tableId, userProfiles) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(userProfiles === null || userProfiles === void 0 ? void 0 : userProfiles.length)) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR sendCancelBattlePopup: useProfiles error `, [
                    userProfiles,
                ]);
                return;
            }
            userProfiles.forEach((userProfile) => {
                this.sendPopUp(userProfile.id, userProfile.socketId, tableId, connections_1.zk.getConfig().ERRM);
            });
        });
    }
    sendPopUp(userId, socketId, tableId, content) {
        // alertPopup.CustomCommonPopup(
        //   socketId,
        //   {
        //     content,
        //     title: POPUP_TITLES.ALERT,
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
        //       text: 'EXIT',
        //       action: ButtonAction.GOTOLOBBY,
        //       color_hex: ColorHexCode.RED,
        //       color: Color.RED,
        //     },
        //   ],
        // );
    }
}
exports.cancelBattle = new CancelBattle();
