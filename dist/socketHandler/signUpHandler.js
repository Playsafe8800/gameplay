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
exports.signUpHandler = void 0;
const newLogger_1 = require("../newLogger");
const redlock_1 = require("redlock");
const connections_1 = require("../connections");
const constants_1 = require("../constants");
const errors_1 = require("../constants/errors");
const userProfile_1 = require("../db/userProfile");
const addTable_1 = require("../services/signUp/addTable");
const reconnectTable_1 = require("../services/signUp/reconnectTable");
const errors_2 = require("../utils/errors");
const redlock_2 = require("../utils/lock/redlock");
const request_validator_1 = require("../validators/request.validator");
const index_1 = require("../utils/errors/index");
const centralLibrary_1 = require("../centralLibrary");
const enums_1 = require("../enums");
function signUpHandler(signUpData, socket, networkParams) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let lock;
        try {
            let response;
            newLogger_1.Logger.info(`New SignUp Request with socket data `, [
                socket.data,
                `and signupData  and socket id ${socket.id}`,
                signUpData,
                socket.data.AppType,
            ]);
            (0, request_validator_1.validateSignUp)(signUpData);
            lock = yield redlock_2.redlock.Lock.acquire([`${socket.userId}`], 2000);
            newLogger_1.Logger.info(`Lock acquired, in signupHandler resource:, ${lock.resource}`);
            const userProfile = yield userProfile_1.userProfileService.getOrCreateUserDetailsById(socket.userId, socket.id, Object.assign(Object.assign({}, (_a = socket.handshake) === null || _a === void 0 ? void 0 : _a.headers), { token: socket.data.token }), '', socket.data.AppType);
            if (signUpData.connectionType === constants_1.CONNECTION_TYPE.ADD_TABLE) {
                const { lobbyId, inviteCode } = signUpData;
                if (!lobbyId && !inviteCode)
                    throw new Error('lobbyId required for addTable');
                response = yield (0, addTable_1.addTable)(signUpData, socket, networkParams);
            }
            else {
                // RECONNECTION / REJOIN FLOW
                if (signUpData.connectionType === constants_1.CONNECTION_TYPE.RECONNECTION ||
                    signUpData.connectionType === constants_1.CONNECTION_TYPE.REJOIN) {
                    newLogger_1.Logger.info(`signupHandler: connectionType: ${signUpData.connectionType}`);
                    response = yield (0, reconnectTable_1.reconnectTable)(socket, signUpData.connectionType);
                }
            }
            response.tenant = userProfile.tenant;
            const tempResponse = Object.assign({ success: true }, response);
            return tempResponse;
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR signupHandler err >>`, [error]);
            let errorObj = {};
            if (error instanceof index_1.MultiAccountError) {
                errorObj = {
                    errorMessage: connections_1.zk.getConfig().MULTI_ACCOUNT_TEXT,
                    errorCode: errors_1.ERROR_CODE.MULTI_ACCOUNT_FRAUD_DETECTED,
                };
            }
            else if (error instanceof errors_2.UnauthorizedError) {
                errorObj = {
                    errorMessage: connections_1.zk.getConfig().AFM,
                    errorCode: errors_1.ERROR_CODE.UNAUTHORIZED,
                };
            }
            else if (error instanceof errors_2.InsufficientFundError) {
                errorObj = {
                    errorMessage: connections_1.zk.getConfig().IMWPM,
                    errorCode: errors_1.ERROR_CODE.INSUFFICIENT_FUND,
                };
            }
            else if (error instanceof errors_2.FraudError) {
                const fraudMessage = error.message || connections_1.zk.getConfig().FRAUD_USER_TEXT;
                centralLibrary_1.alertPopup.CustomCommonPopup(socket, {
                    content: fraudMessage,
                    title: constants_1.POPUP_TITLES.FAIRPLAY_VIOLATION,
                    textColor: enums_1.ColorHexCode.WHITE,
                }, {
                    apkVersion: 0,
                    tableId: '',
                    userId: `${socket.userId}`,
                    error: enums_1.AlertType.GAME_SERVER_ERROR,
                    reason: enums_1.GAME_SERVER_ERROR_REASONS.FRAUD_DETECTED_GSE,
                }, [
                    {
                        text: 'EXIT',
                        action: enums_1.ButtonAction.GOTOLOBBY,
                        color_hex: enums_1.ColorHexCode.RED,
                        color: enums_1.Color.RED,
                    },
                ]);
                errorObj = {
                    errorMessage: fraudMessage,
                    errorCode: errors_1.ERROR_CODE.MULTI_ACCOUNT_FRAUD_DETECTED,
                };
            }
            return { success: false, error: errorObj };
        }
        finally {
            try {
                if (lock && lock instanceof redlock_1.Lock) {
                    yield redlock_2.redlock.Lock.release(lock);
                    newLogger_1.Logger.info(`Lock releasing, in signupHandler; resource:, ${lock.resource}`);
                }
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on signupHandler: ${err}`);
            }
        }
    });
}
exports.signUpHandler = signUpHandler;
