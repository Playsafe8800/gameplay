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
exports.sendPopupOnGrpcFailed = exports.removeOnGrpcSuccessFalse = void 0;
const newLogger_1 = require("../newLogger");
const connections_1 = require("../connections");
const constants_1 = require("../constants");
const userProfile_1 = require("../db/userProfile");
function removeOnGrpcSuccessFalse(tableData, playingUsersPgp, errMsg, reason) {
    return __awaiter(this, void 0, void 0, function* () {
        newLogger_1.Logger.info(`removeOnGrpcSuccessFalse: `, [
            tableData,
            playingUsersPgp,
        ]);
        // Import here to avoid circular dependency
        const LeaveTableHandler = (yield Promise.resolve().then(() => __importStar(require('../services/leaveTable'))))
            .default;
        for (let i = 0; i < playingUsersPgp.length; i++) {
            const currentPlayer = playingUsersPgp[i];
            const userObject = yield userProfile_1.userProfileService.getUserDetailsById(currentPlayer.userId);
            if (userObject) {
                yield sendPopupOnGrpcFailed(userObject.id, tableData._id, errMsg || connections_1.zk.getConfig().ERRM);
                yield LeaveTableHandler.main({
                    reason: constants_1.LEAVE_TABLE_REASONS.GRPC_FAILED,
                    // TODO: enable this when client handles exit from generic popup, currently it's not exiting from popup
                    // reason: reason || LEAVE_TABLE_REASONS.GRPC_FAILED,
                    tableId: tableData._id,
                }, userObject.id);
            }
        }
    });
}
exports.removeOnGrpcSuccessFalse = removeOnGrpcSuccessFalse;
function sendPopupOnGrpcFailed(userId, tableId, errMsg) {
    return __awaiter(this, void 0, void 0, function* () {
        const onePlayerData = yield userProfile_1.userProfileService.getUserDetailsById(userId);
        if (!onePlayerData)
            return newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR sendPopupOnGrpcFailed: userprofile data not found for user: ${userId}`);
        // alertPopup.CustomCommonPopup(
        //   onePlayerData.socketId,
        //   {
        //     content: errMsg,
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
        //       action: ButtonAction.OKAY,
        //       color_hex: ColorHexCode.RED,
        //       color: Color.RED,
        //     },
        //   ],
        // );
    });
}
exports.sendPopupOnGrpcFailed = sendPopupOnGrpcFailed;
