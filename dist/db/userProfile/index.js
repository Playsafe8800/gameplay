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
exports.userProfileService = void 0;
const newLogger_1 = require("../../newLogger");
const constants_1 = require("../../constants");
const errors_1 = require("../../constants/errors");
const utils_1 = require("../../utils");
const errors_2 = require("../../utils/errors");
const redisWrapper_1 = require("../redisWrapper");
const userService_1 = __importDefault(require("../../userService"));
class UserProfile {
    generateUserDetailsKey(userId) {
        return `${(0, utils_1.getIdPrefix)()}:${constants_1.TABLE_PREFIX.PLAYER}:${userId}`;
    }
    setUserDetails(userId, userData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // @ts-ignore
                userData.tenant = null;
                // userProfileValidator(userData);
                const userKey = this.generateUserDetailsKey(userId);
                yield (0, redisWrapper_1.setValueInKeyWithExpiry)(userKey, userData);
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error occurred in setUserDetails ${error.message} ${error}`);
                throw new errors_2.CancelBattleError(error.message, errors_1.ERROR_CAUSES.VALIDATION_ERROR);
            }
        });
    }
    removeTableIdFromProfile(userId, tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            const userData = yield this.getUserDetailsById(userId);
            if (userData && userData.tableIds) {
                userData.tableIds = userData.tableIds.filter((tid) => {
                    return tid !== tableId;
                });
                yield this.setUserDetails(userId, userData);
            }
        });
    }
    getUserDetailsById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userKey = this.generateUserDetailsKey(userId);
                const user = yield (0, redisWrapper_1.getValueFromKey)(userKey);
                return user;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error occurred in getUserDetailsById ${error.message} ${error}`);
                throw new errors_2.CancelBattleError(error.message, errors_1.ERROR_CAUSES.VALIDATION_ERROR);
            }
        });
    }
    getOrCreateUserDetailsById(userId, socketId = '', socketHeaders = {}, unitySessionId = '', appType) {
        return __awaiter(this, void 0, void 0, function* () {
            const userKey = this.generateUserDetailsKey(userId);
            let user = yield (0, redisWrapper_1.getValueFromKey)(userKey);
            newLogger_1.Logger.info('getORcreateUserDetailsById', [user]);
            if (!user || !('tenant' in user)) {
                let userData = yield userService_1.default.getUserProfile(userId);
                userData = {
                    profile: Object.assign(Object.assign({}, userData), { userName: userData.username, displayName: userData.username, profitLoss: userData.profitLosss || 0, avatarUrl: '15.png', isPrime: false, socketId: socketId, tableIds: [], 
                        // headers: "",
                        userTablesCash: [], unitySessionId: '' }),
                    tenant: null,
                };
                newLogger_1.Logger.info(`
         ${user}, socketId: ${socketId}`, [userData]);
                if (userData === null || userData === void 0 ? void 0 : userData.profile) {
                    user = this.defaultUserData(userData.profile, socketId, socketHeaders, unitySessionId, userData.tenant);
                    yield (0, redisWrapper_1.setValueInKeyWithExpiry)(userKey, user);
                }
                else {
                    throw new Error(`could not find user details for user ${userId}`);
                }
            }
            else if (socketId || unitySessionId) {
                if (socketId)
                    user.socketId = socketId;
                if (unitySessionId)
                    user.unitySessionId = unitySessionId;
                yield (0, redisWrapper_1.setValueInKeyWithExpiry)(userKey, user);
            }
            return user;
        });
    }
    defaultUserData(userData, socketId, socketHeaders, unitySessionId, tenant) {
        const { id, displayName, avatarUrl, userName, isPrime } = userData;
        return {
            id,
            displayName,
            avatarUrl,
            userName,
            isPrime,
            socketId,
            tableIds: [],
            headers: socketHeaders,
            tenant: `${tenant}`,
            unitySessionId,
            isBot: false,
            level: 'medium',
            userTablesCash: [],
            token: socketHeaders.token,
            profitLoss: 0
        };
    }
}
exports.userProfileService = new UserProfile();
