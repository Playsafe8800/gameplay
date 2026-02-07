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
exports.handleOpenGamePopup = void 0;
const newLogger_1 = require("../../newLogger");
const connections_1 = require("../../connections");
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const userProfile_1 = require("../../db/userProfile");
const utils_1 = require("../../utils");
const index_1 = require("../../utils/errors/index");
const cancelBattle_1 = require("../gameplay/cancelBattle");
function handleOpenGamePopup(data, socket) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!data.tableId || !data.action) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR handlePopupMessage data missing: `, [data]);
                throw new Error('data not valid on handlePopupMessage!');
            }
            const { tableId, action } = data;
            const { userId } = socket;
            const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                'currencyFactor',
                'currencyType',
                'maximumPoints',
                'gameType',
                'maximumSeat',
                'bootValue',
                'currentRound',
            ]);
            const { currentRound, gameType } = tableConfigData;
            const [tableGamePlayData, playerGamePlayData, userProfile,] = yield Promise.all([
                tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                    'tableState',
                    'seats',
                ]),
                playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, ['isFirstTurn', 'userStatus']),
                userProfile_1.userProfileService.getUserDetailsById(userId),
            ]);
            /**
             * True when user is playing and winner has not been declared
             */
            const tableState = [
                constants_1.TABLE_STATE.WAITING_FOR_PLAYERS,
                constants_1.TABLE_STATE.ROUND_TIMER_STARTED,
            ];
            const isUserPlaying = !tableState.includes(tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.tableState) &&
                (playerGamePlayData === null || playerGamePlayData === void 0 ? void 0 : playerGamePlayData.userStatus) === constants_1.PLAYER_STATE.PLAYING;
            const tableBootValue = tableConfigData.bootValue * (tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.seats.length);
            const entryFee = tableBootValue
                ? tableBootValue
                : tableConfigData.bootValue;
            let message = '';
            let title = 'Alert';
            switch (data.action) {
                case constants_1.OPEN_POPUP_ACTION.DECLARE:
                    message = ((_a = connections_1.zk.getConfig()) === null || _a === void 0 ? void 0 : _a.DPM) || '';
                    break;
                case constants_1.OPEN_POPUP_ACTION.EXIT:
                    {
                        if (isUserPlaying) {
                            message =
                                ((_b = connections_1.zk.getConfig()) === null || _b === void 0 ? void 0 : _b.EM.replace('#80', `#${entryFee}`)) || '';
                        }
                        else {
                            message =
                                ((_c = userProfile === null || userProfile === void 0 ? void 0 : userProfile.tableIds) === null || _c === void 0 ? void 0 : _c.length) > 1
                                    ? (_d = connections_1.zk.getConfig()) === null || _d === void 0 ? void 0 : _d.EMM
                                    : ((_e = connections_1.zk.getConfig()) === null || _e === void 0 ? void 0 : _e.EMM.split('$')[0]) ||
                                        ((_f = connections_1.zk.getConfig()) === null || _f === void 0 ? void 0 : _f.EMM);
                        }
                    }
                    break;
                case constants_1.OPEN_POPUP_ACTION.DROP: {
                    const { isFirstTurn } = playerGamePlayData;
                    const points = (0, utils_1.getDropPoints)(isFirstTurn, tableConfigData.maximumPoints, tableConfigData.gameType, tableConfigData.maximumSeat);
                    title = `YOU WILL LOSE ${tableConfigData.currencyType === 'COINS' ? 'COINS' : 'RS'} . ${tableConfigData.currencyFactor * points} IF YOU DROP.`;
                    message =
                        ((_g = connections_1.zk.getConfig()) === null || _g === void 0 ? void 0 : _g.DRM.replace('#20', `#${points} points`)) ||
                            '';
                    if ((0, utils_1.isPointsRummyFormat)(gameType)) {
                        message =
                            ((_h = connections_1.zk
                                .getConfig()) === null || _h === void 0 ? void 0 : _h.DRMP.replace('#20', `#${points} points`)) || '';
                        if (message && points === constants_1.NUMERICAL.FORTY) {
                            message = `Middle ${message}`;
                        }
                    }
                    break;
                }
            }
            const responseData = {
                tableId,
                action,
                message,
                isUserPlaying,
                title,
            };
            return responseData;
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR error on handlePopupMessage: table: ${data.tableId}|action:${data.action},
      errMessage: ${error.message}`, [error]);
            if (error instanceof index_1.CancelBattleError) {
                yield cancelBattle_1.cancelBattle.cancelBattle(data.tableId, error);
            }
            return { success: false, error: error.message };
        }
    });
}
exports.handleOpenGamePopup = handleOpenGamePopup;
