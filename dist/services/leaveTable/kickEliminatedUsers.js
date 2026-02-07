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
exports.kickEliminatedUsers = void 0;
const newLogger_1 = require("../../newLogger");
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const userProfile_1 = require("../../db/userProfile");
const kickEliminatedUsers = (tableId, eliminatedPlayers) => __awaiter(void 0, void 0, void 0, function* () {
    const LeaveTableHandler = (yield Promise.resolve().then(() => __importStar(require('../../services/leaveTable')))).default;
    const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
        'currentRound',
        'maximumPoints',
    ]);
    for (const user of eliminatedPlayers) {
        try {
            const userInfoObj = yield userProfile_1.userProfileService.getUserDetailsById(user.userId);
            newLogger_1.Logger.info('KICK_ELIMINATED_USERS', [
                userInfoObj,
                tableConfigData,
                user,
            ]);
            if (!userInfoObj || !tableConfigData) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR userInfo or tableConfig not found in kickEliminatedUsers >> `);
            }
            const { currentRound, maximumPoints } = tableConfigData;
            const playerGamePlay = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(user.userId, tableId, currentRound, ['dealPoint']);
            if ((playerGamePlay === null || playerGamePlay === void 0 ? void 0 : playerGamePlay.dealPoint) < maximumPoints) {
                continue;
            }
            yield LeaveTableHandler.main({
                tableId,
                reason: constants_1.LEAVE_TABLE_REASONS.ELIMINATED,
            }, (userInfoObj === null || userInfoObj === void 0 ? void 0 : userInfoObj.id) || 0);
        }
        catch (error) {
            newLogger_1.Logger.error('INTERNAL_SERVER_ERROR CATCH_ERROR: kickEliminatedUsers: ', [
                tableId,
                eliminatedPlayers,
                error,
            ]);
        }
        finally {
            try {
                // lock release
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR CATCH_ERROR: kickEliminatedUsers`, [
                    tableId,
                    eliminatedPlayers,
                    error,
                ]);
            }
        }
    }
});
exports.kickEliminatedUsers = kickEliminatedUsers;
