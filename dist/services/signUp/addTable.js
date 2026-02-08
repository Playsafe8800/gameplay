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
exports.sitBotOnTable = exports.addTable = void 0;
const newLogger_1 = require("../../newLogger");
const numerical_1 = require("../../constants/numerical");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const userService_1 = require("../userService");
const userService_2 = __importDefault(require("../../userService"));
const tableOperation_1 = require("./tableOperation");
const utils_1 = require("../../utils");
const userProfile_1 = require("../../db/userProfile");
const redisWrapper_1 = require("../../db/redisWrapper");
const tableGameplay_1 = require("../../db/tableGameplay");
const constants_1 = require("../../constants");
const redlock_1 = require("../../utils/lock/redlock");
const redlock_2 = require("redlock");
const events_1 = require("../../state/events");
const userService_3 = __importDefault(require("../../userService"));
function addTable(signUpData, socket, networkParams) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { lobbyId, unitySessionId, tableSessionId } = signUpData;
            if (!lobbyId)
                throw new Error('lobbyId required for addTable');
            newLogger_1.Logger.info(`Add table started for lobby Id ${lobbyId}, socketId: ${socket.id}, user: ${socket.userId}`);
            const { userId } = socket;
            // Get lobby config
            const lobbyInfo = yield userService_2.default.getLobby(lobbyId);
            const { EntryFee, MaxPoints, RummyTips, ShowEmoji, GameFormat, MaxPlayers, MinPlayers, HideProfile, ManualSplit, RoundShuffle, SocketTimeout, UserTurnTimer, GameStartTimer, MaxPingCounter, ShowLeaderboard, UserFinishTimer, Max_player_count, Min_player_count, NetworkIndicator, PileDiscardCheck, FestivalUIEnabled, RequestRetryCount, RequestRetryDelay, SocketErrorTimeout, GameId, MaxBonusPercentage, isNewUI, LobbyId, CurrencyId, isMultiBotEnabled, } = lobbyInfo;
            const lobbyGameConfig = {
                MP: 2,
                SP: '',
                ESP: 2,
                Host: '',
                Rake: 10,
                BaseURL: '',
                EntryFee,
                MaxPoints: MaxPoints,
                RummyTips,
                ShowEmoji,
                GameFormat,
                MaxPlayers,
                MinPlayers,
                HideProfile,
                ManualSplit,
                RoundShuffle,
                SocketTimeout,
                UserTurnTimer,
                GameStartTimer,
                MaxPingCounter,
                ShowLeaderboard,
                UserFinishTimer,
                Max_player_count,
                Min_player_count,
                NetworkIndicator,
                PileDiscardCheck,
                FestivalUIEnabled,
                RequestRetryCount,
                RequestRetryDelay,
                SocketErrorTimeout,
                GameId,
                LobbyId,
                MaxBonusPercentage,
                isNewUI,
                globalMatchMaking: false,
                mmAlgo: '',
                cgsClusterName: '',
                CurrencyFactor: EntryFee,
                CurrencyId,
                isMultiBotEnabled,
            };
            const tableConfigurationData = tableConfiguration_1.tableConfigurationService.getDefaultTableConfigRedisObject(lobbyGameConfig);
            // Create or find user
            const userData = yield userService_1.userService.findOrCreateUser(userId, socket.id, (_a = socket.handshake) === null || _a === void 0 ? void 0 : _a.headers, socket.data.AppType, unitySessionId);
            const gtiData = yield tableOperation_1.tableOperation.addInTable(socket, tableConfigurationData, userData, numerical_1.NUMERICAL.ONE, networkParams, tableSessionId);
            newLogger_1.Logger.info('ADD TABLE', [gtiData]);
            const profile = yield userService_3.default.getUserProfile(userId);
            userData.profitLoss = profile.profitLosss || 0;
            yield userProfile_1.userProfileService.setUserDetails(userId, userData);
            const getBotProfitThreshold = constants_1.BOT_CONFIG.GET_BOT_PROFIT_THRESHOLD;
            const bannedUsersForBot = constants_1.BOT_CONFIG.BANNED_USERS_FROM_BOTS.split(',');
            // if (
            //   tableConfigurationData.isMultiBotEnabled &&
            //   tableConfigurationData.maximumSeat == 6 &&
            //   gtiData?.isNewTable &&
            //   userData.profitLoss < getBotProfitThreshold &&
            //   !bannedUsersForBot.includes(userId.toString())
            // ) {
            //   const botRange =
            //     BOT_CONFIG.MULTI_BOT_RANGE.split(',');
            //   let totalBot =
            //     Number(botRange[Math.floor(Math.random() * botRange.length)])
            //
            //   const DELAY_MULTIPLIER = BOT_CONFIG.DELAY_MULTIPLIER
            //
            //   let waitTime = 1
            //   for (let i = 1; i <= totalBot; i++) {
            //     waitTime += Math.round(i * DELAY_MULTIPLIER)
            //     await scheduler.addJob.bot(
            //       gtiData.tableId,
            //       gtiData.currentRound,
            //       waitTime* NUMERICAL.THOUSAND,
            //     );
            //   }
            // } else {
            //   if (
            //     gtiData.playerInfo.length === 1 &&
            //     userData.profitLoss < getBotProfitThreshold &&
            //     !bannedUsersForBot.includes(userId.toString())
            //   ) {
            //     await scheduler.addJob.bot(
            //       gtiData.tableId,
            //       gtiData.currentRound,
            //       BOT_CONFIG.BOT_WAITING_TIME_IN_MS,
            //     );
            //   }
            // }
            return {
                signupResponse: {
                    userId: userData.id,
                    username: userData.userName,
                    profilePicture: userData.avatarUrl,
                    tenant: userData.tenant,
                },
                gameTableInfoData: [gtiData],
                tableId: gtiData.tableId,
            };
        }
        catch (error) {
            // TODO: Handle IFE error here
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at add table handler`, [error]);
            throw error;
        }
    });
}
exports.addTable = addTable;
function sitBotOnTable(tableId) {
    return __awaiter(this, void 0, void 0, function* () {
        let lock;
        try {
            lock = yield redlock_1.redlock.Lock.acquire([`lock:${tableId}`], 2000);
            newLogger_1.Logger.info(`start game with bot for table ${tableId}`);
            const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                '_id',
                'currentRound',
                'maximumSeat',
                'maximumPoints',
                'gameType',
                'dealsCount',
                'currencyType',
                'lobbyId',
                'minimumSeat',
                'gameStartTimer',
                'bootValue',
                'isMultiBotEnabled',
            ]);
            if (!tableConfigData) {
                throw new Error(`Table data is not set correctly ${tableId}`);
            }
            const tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, 1, ['tableState', 'noOfPlayers']);
            if (!tableGameData)
                throw new Error(`TableGamePlay not found, ${tableId}`);
            if (!tableConfigData.isMultiBotEnabled &&
                (tableGameData.tableState !== constants_1.TABLE_STATE.WAITING_FOR_PLAYERS ||
                    tableGameData.noOfPlayers !== numerical_1.NUMERICAL.ONE))
                return;
            if (tableConfigData.isMultiBotEnabled &&
                ((tableGameData.tableState !==
                    constants_1.TABLE_STATE.ROUND_TIMER_STARTED &&
                    tableGameData.tableState !==
                        constants_1.TABLE_STATE.WAITING_FOR_PLAYERS) ||
                    tableGameData.noOfPlayers === 0 ||
                    tableGameData.noOfPlayers === tableConfigData.maximumSeat))
                return;
            const dummyPlayer = yield (0, utils_1.getBot)(tableConfigData.bootValue);
            const userProfile = yield userProfile_1.userProfileService.getOrCreateUserDetailsById(dummyPlayer.id, 'jkdfuhakj', {}, '', 'rummyType');
            const currentState = yield events_1.eventStateManager.getCurrentState(tableId);
            if (currentState === 'none') {
                yield events_1.eventStateManager.createState(tableId);
            }
            userProfile.isBot = true;
            yield tableOperation_1.tableOperation.insertNewPlayer(undefined, userProfile, tableConfigData, true);
            const userKey = userProfile_1.userProfileService.generateUserDetailsKey(Number(dummyPlayer.id));
            userProfile.level = dummyPlayer.level;
            userProfile.userName = makeid(8);
            yield (0, redisWrapper_1.setValueInKeyWithExpiry)(userKey, userProfile);
            newLogger_1.Logger.info(`${dummyPlayer.id} bot user sitted on table ${tableId}`);
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at sitBotOnTable ${tableId}`, [error]);
            throw error;
        }
        finally {
            try {
                if (lock && lock instanceof redlock_2.Lock) {
                    yield redlock_1.redlock.Lock.release(lock);
                    newLogger_1.Logger.info(`Lock releasing, in sitBotOnTable; resource:, ${lock.resource}`);
                }
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on sitBotOnTable: ${err}`, [err]);
            }
        }
    });
}
exports.sitBotOnTable = sitBotOnTable;
function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}
///k
