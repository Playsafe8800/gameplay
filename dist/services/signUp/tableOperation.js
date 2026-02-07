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
exports.tableOperation = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const underscore_1 = __importDefault(require("underscore"));
const constants_1 = require("../../constants");
const events_1 = require("../../constants/events");
const playerGameplay_1 = require("../../db/playerGameplay");
const redisWrapper_1 = require("../../db/redisWrapper");
const index_1 = require("../../db/redisWrapper/index");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const events_2 = require("../../state/events");
const utils_1 = require("../../utils");
const date_1 = require("../../utils/date");
const redlock_2 = require("../../utils/lock/redlock");
const defaultData_1 = __importDefault(require("../defaultData"));
const initialiseGame_1 = require("../gameplay/initialiseGame");
const schedulerQueue_1 = require("../schedulerQueue");
const gameTableInfo_1 = __importDefault(require("./gameTableInfo"));
const cancelBattle_1 = require("../gameplay/cancelBattle");
class TableOperation {
    addInTable(socket, tableConfigurationData, userData, retries = constants_1.NUMERICAL.ONE, networkParams, tableSessionId, fromSQS = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let isNewTable = false;
            if (retries > constants_1.NUMERICAL.THREE) {
                throw new Error(`could not find table even after ${retries} retries`);
            }
            let lock;
            let tableGameData;
            let tableId;
            try {
                const userId = userData.id;
                // const { userName, avatarUrl, isPrime } = userData;
                const { lobbyId, maximumSeat, bootValue, gameType } = tableConfigurationData;
                const key = `${(0, utils_1.getIdPrefix)(gameType)}:${lobbyId}`;
                let roundNum = constants_1.NUMERICAL.ONE;
                const { mmAlgo } = tableConfigurationData;
                let ifTableExist = true;
                if (!fromSQS) {
                    tableId = yield this.getAvailableTable(key, userData, maximumSeat, gameType);
                    if (!tableId) {
                        ifTableExist = false;
                        tableId = yield this.createTable(tableConfigurationData);
                        yield this.setupRound(tableId, roundNum, tableConfigurationData, null);
                        isNewTable = true;
                    }
                    else {
                        tableConfigurationData =
                            yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
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
                            ]);
                    }
                }
                newLogger_1.Logger.info(`addInTable found or created tableId: ${tableId} for user: ${userId}`, [tableConfigurationData]);
                lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 2000);
                newLogger_1.Logger.info(`Lock acquired, in addInTable resource:, ${lock.resource}`);
                // update round number here to get latest pgp data for points
                if ((0, utils_1.isPointsRummyFormat)(gameType))
                    roundNum = tableConfigurationData.currentRound;
                newLogger_1.Logger.info(`Attempting to get table gameplay data for tableId: ${tableId}, round: ${roundNum}`);
                tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, roundNum, ['tableState', 'noOfPlayers']);
                newLogger_1.Logger.info(`Retrieved table gameplay data:`, [tableGameData]);
                if (!tableGameData) {
                    throw new Error(`Table game data is not set up while add table operation`);
                }
                if (tableGameData.noOfPlayers === maximumSeat) {
                    return yield this.addInTable(socket, tableConfigurationData, userData, retries + 1, networkParams, tableSessionId);
                }
                if (!(tableGameData.tableState ===
                    constants_1.TABLE_STATE.ROUND_TIMER_STARTED ||
                    tableGameData.tableState === constants_1.TABLE_STATE.WAITING_FOR_PLAYERS)) {
                    newLogger_1.Logger.info(`Found table at retry ${retries} but already locked`, [tableId]);
                    try {
                        if (lock && lock instanceof redlock_1.Lock) {
                            yield redlock_2.redlock.Lock.release(lock);
                            newLogger_1.Logger.info(`Lock releasing, in addInTable; resource:, ${lock.resource}`);
                        }
                    }
                    catch (err) {
                        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on addInTable: ${err}`, [err]);
                    }
                    return yield this.addInTable(socket, tableConfigurationData, userData, retries + 1, networkParams, tableSessionId);
                }
                const gtiData = yield this.insertNewPlayer(socket, userData, tableConfigurationData, true, networkParams, tableSessionId);
                gtiData.isNewTable = isNewTable;
                return gtiData;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error occurred in addInTable ${error}`, [error]);
            }
            finally {
                try {
                    if (lock && lock instanceof redlock_1.Lock) {
                        yield redlock_2.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in addInTable; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on addInTable: ${err}`, [err]);
                }
            }
        });
    }
    checkBeforeStartRound(userId, tableConfigurationData, updatedTableGameplayData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { _id: tableId, currentRound, gameType, lobbyId, } = tableConfigurationData;
            const { noOfPlayers } = updatedTableGameplayData;
            if (noOfPlayers === tableConfigurationData.minimumSeat) {
                newLogger_1.Logger.info(`schedule has been started min player joined in ${tableId}, ${noOfPlayers}`);
                const roundTimerStartedData = {
                    tableId,
                    currentRound: tableConfigurationData.currentRound || 1,
                    timer: date_1.dateUtils.addEpochTimeInSeconds(tableConfigurationData.gameStartTimer),
                };
                yield schedulerQueue_1.scheduler.addJob.tableStart(tableId, (tableConfigurationData.gameStartTimer - constants_1.NUMERICAL.FIVE) *
                    constants_1.NUMERICAL.THOUSAND);
                // change state
                yield Promise.all([
                    events_2.eventStateManager.fireEvent(tableId, events_1.STATE_EVENTS.START_ROUND_TIMER),
                    socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.ROUND_TIMER_STARTED, roundTimerStartedData),
                ]);
                updatedTableGameplayData.tableState =
                    constants_1.TABLE_STATE.ROUND_TIMER_STARTED;
                const currentTime = new Date();
                updatedTableGameplayData.tableCurrentTimer = new Date(currentTime.setSeconds(currentTime.getSeconds() +
                    Number(tableConfigurationData.gameStartTimer))).toISOString();
                updatedTableGameplayData.potValue = 0;
                if (!(0, utils_1.isPointsRummyFormat)(gameType)) {
                    updatedTableGameplayData.potValue =
                        tableConfigurationData.bootValue * noOfPlayers;
                }
            }
            yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, updatedTableGameplayData);
            const key = `${(0, utils_1.getIdPrefix)(gameType)}:${lobbyId}`;
            if (noOfPlayers < tableConfigurationData.maximumSeat) {
                yield (0, redisWrapper_1.pushIntoQueue)(key, tableId);
            }
            return updatedTableGameplayData;
        });
    }
    createTable(tableConfigData) {
        return __awaiter(this, void 0, void 0, function* () {
            // create new table
            const tableId = (0, utils_1.getRandomTableId)();
            tableConfigData =
                typeof tableConfigData == 'string'
                    ? JSON.parse(tableConfigData)
                    : tableConfigData;
            tableConfigData._id = tableId;
            tableConfigData.currentRound = constants_1.NUMERICAL.ONE;
            yield tableConfiguration_1.tableConfigurationService.setTableConfiguration(tableId, tableConfigData, true);
            return tableId;
        });
    }
    getAvailableTable(key, userData, maximumSeat, gameType) {
        return __awaiter(this, void 0, void 0, function* () {
            let tableId;
            const defaultTableGame = {
                seats: [],
            };
            let tableGameData = defaultTableGame;
            let seats = tableGameData.seats.filter((ele) => ele._id);
            while ((tableGameData &&
                tableGameData.tableState !==
                    constants_1.TABLE_STATE.WAITING_FOR_PLAYERS &&
                tableGameData.tableState !==
                    constants_1.TABLE_STATE.ROUND_TIMER_STARTED) ||
                seats.length === maximumSeat) {
                tableId = '';
                tableGameData = null;
                tableId = yield (0, redisWrapper_1.popFromQueue)(key);
                newLogger_1.Logger.info('tableId fetched from available table ', [tableId, seats, tableGameData && tableGameData.tableState]);
                if (userData.tableIds.indexOf(tableId) != -1) {
                    const tbId = yield (0, redisWrapper_1.popFromQueue)(key);
                    yield (0, redisWrapper_1.pushIntoQueue)(key, tableId);
                    tableId = tbId;
                }
                if (tableId) {
                    const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, ['currentRound']);
                    // if tableConfig not found then find a new table
                    if (!tableConfigData) {
                        tableId = '';
                    }
                    else {
                        tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, (0, utils_1.isPointsRummyFormat)(gameType)
                            ? tableConfigData.currentRound
                            : constants_1.NUMERICAL.ONE, ['seats', "tableState"]);
                        if (tableGameData.seats.length !== maximumSeat) {
                            tableGameData = tableGameData || defaultTableGame;
                            seats = tableGameData.seats.filter((ele) => ele._id);
                        }
                        else {
                            tableId = '';
                            tableGameData = defaultTableGame;
                        }
                        newLogger_1.Logger.info('tableId fetched from available table seats ', [seats, tableId, tableGameData && tableGameData.tableState]);
                    }
                }
            }
            return tableId;
        });
    }
    setupRound(tableId, roundNumber, tableConfigurationData, oldTableGamePlayData) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableGamePlayData = defaultData_1.default.getTableGameplayData(oldTableGamePlayData);
            // state creation
            // for pool and deals stated will be created on first round
            if ((0, utils_1.isPointsRummyFormat)(tableConfigurationData.gameType) ||
                roundNumber === constants_1.NUMERICAL.ONE)
                yield events_2.eventStateManager.createState(tableId);
            return Promise.all([
                // create Game Table
                this.insertTableGamePlay(tableGamePlayData, tableId, roundNumber),
                // update currentRound in tableConfig
                this.updateTableConfigRoundNumber(tableConfigurationData, roundNumber),
            ]);
        });
    }
    insertNewPlayer(socket, userData, tableConfigurationData, startRoundTimer, networkParams, tableSessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id: userId, userName, avatarUrl, isPrime, tenant, } = userData;
            const { _id: tableId } = tableConfigurationData;
            const { playerGameplayData, updatedTableGameplayData } = yield this.insertPlayerInTable(userData, tableConfigurationData, undefined, networkParams, tableSessionId);
            const filteredSeats = updatedTableGameplayData.seats.filter((seat) => seat._id);
            const promiseList = filteredSeats.map((seat) => userProfile_1.userProfileService.getOrCreateUserDetailsById(seat._id));
            const promiseListPGP = filteredSeats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, tableConfigurationData.currentRound, [
                'userId',
                'userStatus',
                'points',
                'seatIndex',
                'dealPoint',
                'isAutoDrop',
                'isFirstTurn',
            ]));
            newLogger_1.Logger.info(`filteredSeats are on table ${tableId}`, [
                filteredSeats,
                `Users list is ${tableId}: `,
                promiseList,
            ]);
            const usersData = yield Promise.all(promiseList);
            const playerGameplayDataUsers = yield Promise.all(promiseListPGP);
            newLogger_1.Logger.info(`Table ${tableId} usersData is`, [
                usersData,
                `playerGameplayDataUsers: `,
                playerGameplayDataUsers,
            ]);
            const playerInfoPromise = filteredSeats.map((seat) => userProfile_1.userProfileService.getOrCreateUserDetailsById(seat._id));
            const userCashObj = ((userData === null || userData === void 0 ? void 0 : userData.userTablesCash) &&
                userData.userTablesCash.find((utc) => utc.tableId === tableId)) || { userCash: 0 };
            const playerJoinedData = {
                tableId,
                availablePlayers: filteredSeats.length,
                seatIndex: playerGameplayData.seatIndex,
                userId,
                username: userName,
                profilePicture: avatarUrl,
                prime: isPrime,
                tableState: updatedTableGameplayData.tableState,
                totalPoints: playerGameplayData.dealPoint,
                tenant,
                userCash: userCashObj.userCash,
            };
            yield socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.PLAYER_JOINED, playerJoinedData);
            const totalPlayers = yield Promise.all(playerInfoPromise);
            // const totalPlayersCount = totalPlayers.length;
            updatedTableGameplayData.noOfPlayers = totalPlayers.length;
            // RUM-5607
            // this.sendInstrumentation(
            //   tableConfigurationData,
            //   updatedTableGameplayData,
            //   userId,
            //   totalPlayers,
            //   socket,
            // );
            if (!userData.isBot)
                this.addPlayerInTable(socket, {
                    tableId,
                    usersData,
                    maximumSeat: tableConfigurationData === null || tableConfigurationData === void 0 ? void 0 : tableConfigurationData.maximumSeat,
                });
            const updatedTgp = yield this.checkBeforeStartRound(userId, tableConfigurationData, updatedTableGameplayData);
            const gtiData = gameTableInfo_1.default.formatGameTableInfo(tableConfigurationData, updatedTgp, usersData, playerGameplayDataUsers, playerGameplayData);
            newLogger_1.Logger.info(`gtiData: `, [gtiData]);
            return gtiData;
        });
    }
    insertPlayerInTable(userData, tableConfigData, oldPlayerGameplayData, networkParams, tableSessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id: userId } = userData;
            const { _id: tableId, currentRound, maximumPoints, } = tableConfigData;
            newLogger_1.Logger.info(`insertPlayerInTable user: ${userId}, table: ${tableId}:${currentRound}`);
            const tableGameplayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['seats', 'tableState', 'noOfPlayers']);
            if (!tableGameplayData) {
                throw new Error(`tableGameplayData not found in insertPlayerInTable for ${tableId}`);
            }
            const seatIndex = this.insertPlayerInSeat(tableGameplayData.seats, userId, userData.isBot);
            let dealPoint = (oldPlayerGameplayData === null || oldPlayerGameplayData === void 0 ? void 0 : oldPlayerGameplayData.dealPoint) || 0;
            if (tableConfigData.gameType === constants_1.RUMMY_TYPES.DEALS &&
                !dealPoint) {
                dealPoint = 160;
            }
            const playerGameplayData = playerGameplay_1.playerGameplayService.getDefaultPlayerGameplayData(userId, seatIndex || 0, dealPoint, false, networkParams, tableSessionId);
            if (oldPlayerGameplayData &&
                (oldPlayerGameplayData === null || oldPlayerGameplayData === void 0 ? void 0 : oldPlayerGameplayData.dealPoint) >= maximumPoints) {
                playerGameplayData.userStatus =
                    oldPlayerGameplayData && oldPlayerGameplayData.userStatus
                        ? oldPlayerGameplayData.userStatus
                        : playerGameplayData.userStatus;
            }
            if (!userData.tableIds.includes(tableId)) {
                // remove this for multi table
                userData.tableIds = [];
                userData.userTablesCash = [];
                userData.tableIds.push(tableId);
                userData.userTablesCash.push({
                    tableId,
                    userCash: tableConfigData.bootValue,
                });
            }
            // addPlayerInTable;
            yield Promise.all([
                playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGameplayData),
                tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameplayData),
                userProfile_1.userProfileService.setUserDetails(userId, userData),
            ]);
            // user state creation
            if ((0, utils_1.isPointsRummyFormat)(tableConfigData.gameType) ||
                currentRound === constants_1.NUMERICAL.ONE) {
                yield events_2.eventStateManager.createUserState(tableId, userId);
            }
            else {
                yield events_2.eventStateManager.fireEventUser(tableId, userId, events_1.USER_EVENTS.PLAYING, (networkParams === null || networkParams === void 0 ? void 0 : networkParams.timeStamp) || date_1.dateUtils.getCurrentEpochTime());
            }
            return {
                playerGameplayData,
                updatedTableGameplayData: tableGameplayData,
            };
        });
    }
    insertPlayerInSeat(seats, userObjectId, isBot) {
        let seatIndex;
        let seatObject = {};
        for (let i = 0; i < seats.length; ++i) {
            const seat = seats[i];
            // found an empty place in array
            if (!seat)
                break;
            // found a left seat
            if (!seat._id) {
                seatIndex = i;
                seatObject = seat;
            }
            else if (seat._id === userObjectId) {
                return i;
            }
        }
        if (seatIndex === undefined) {
            seatIndex = seats.length;
            seats.push({
                _id: userObjectId,
                seat: seatIndex,
                isBot
            });
        }
        else {
            seatObject._id = userObjectId;
            seatObject.seat = seatIndex;
            seatObject.isBot = isBot;
        }
        // check if same seatIndex found here in seat
        let dublicateSeat = false;
        let isZeroAvailable = true;
        for (let i = 0; i < seats.length; i++) {
            const element = seats[i];
            if (element.seat === 0)
                isZeroAvailable = false;
            if (element.seat === seatIndex && userObjectId !== element._id)
                dublicateSeat = true;
        }
        if (dublicateSeat) {
            seatIndex = isZeroAvailable ? 0 : seats.length;
            for (let i = 0; i < seats.length; i++) {
                if (seats[i]['_id'] === userObjectId)
                    seats[i]['seat'] = seatIndex;
            }
        }
        return seatIndex;
    }
    updateTableConfigRoundNumber(tableConfigurationData, currentRound) {
        return __awaiter(this, void 0, void 0, function* () {
            yield tableConfiguration_1.tableConfigurationService.updateCurrentRound(tableConfigurationData._id, currentRound);
        });
    }
    insertTableGamePlay(tableGameplayData, tableId, roundNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, roundNumber, tableGameplayData);
        });
    }
    addPlayerInTable(socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { tableId } = data;
            if (socket)
                yield socketOperation_1.socketOperation.addClientInRoom(socket, tableId);
        });
    }
    initializeGameplayForFirstRound(data) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info('initializeGameplayForFirstRound');
            const { tableId } = data;
            let lock;
            try {
                lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 2000);
                newLogger_1.Logger.info(`Lock acquired, in initializeGameplayForFirstRound resource:, ${lock.resource}`);
                const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    "_id",
                    'currentRound',
                    'minimumSeat',
                    'lobbyId',
                    'maximumSeat',
                    'gameType',
                    'bootValue',
                    'currencyType',
                    'isMultiBotEnabled'
                ]);
                const { currentRound } = tableConfigData;
                let tableGameplayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['seats']);
                if (!tableGameplayData || !tableConfigData) {
                    throw new Error(`Table data is not set correctly ${tableId}`);
                }
                tableGameplayData.tableState = constants_1.TABLE_STATE.LOCK_IN_PERIOD;
                yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameplayData);
                let currentPlayersInTable = tableGameplayData.seats.filter((seat) => seat._id).sort((a, b) => a.seat - b.seat);
                if (currentPlayersInTable &&
                    currentPlayersInTable.length >= tableConfigData.minimumSeat) {
                    let playingUsersWithUserId = yield Promise.all(currentPlayersInTable
                        .map((e) => __awaiter(this, void 0, void 0, function* () {
                        var _a, _b;
                        const userObject = yield userProfile_1.userProfileService.getUserDetailsById(e._id);
                        const playerGamePlay = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(e._id, tableId, currentRound, ['tableSessionId']);
                        e.userId = userObject === null || userObject === void 0 ? void 0 : userObject.id;
                        e.sessionId = playerGamePlay === null || playerGamePlay === void 0 ? void 0 : playerGamePlay.tableSessionId;
                        const userDetail = {
                            playingUser: Object.assign(Object.assign({}, e), { isBot: userObject === null || userObject === void 0 ? void 0 : userObject.isBot }),
                            userLobbyDetail: {
                                userId: e.userId || 0,
                                lobbyId: tableConfigData.lobbyId,
                                appType: (_a = userObject === null || userObject === void 0 ? void 0 : userObject.headers) === null || _a === void 0 ? void 0 : _a.apptype,
                                sessionId: (playerGamePlay === null || playerGamePlay === void 0 ? void 0 : playerGamePlay.tableSessionId) || '',
                                appVersion: (_b = userObject === null || userObject === void 0 ? void 0 : userObject.headers) === null || _b === void 0 ? void 0 : _b.versionname,
                            },
                        };
                        return userDetail;
                    }))
                        .filter((detail) => detail !== null));
                    const botIndexs = [];
                    if (tableConfigData.isMultiBotEnabled) {
                        for (let i = 0; i < playingUsersWithUserId.length; i++) {
                            const firstEle = playingUsersWithUserId[i]['playingUser'];
                            if (firstEle.isBot)
                                botIndexs.push({ _id: firstEle._id, seat: firstEle.seat });
                        }
                        if (botIndexs.length === currentPlayersInTable.length) {
                            yield initialiseGame_1.initializeGame.removeInsuficientFundUser(currentPlayersInTable.map((e) => e._id), tableConfigData, null);
                            return;
                        }
                    }
                    playingUsersWithUserId = playingUsersWithUserId.filter((e) => e);
                    const key = `${constants_1.REDIS_CONSTANTS.QUEUE}:${(0, utils_1.getIdPrefix)(tableConfigData.gameType)}:${tableConfigData.lobbyId}`;
                    yield (0, index_1.removeValueFromSet)(key, tableId);
                    const grpcRes = yield initialiseGame_1.initializeGame.createBattle(tableId, playingUsersWithUserId, tableConfigData);
                    if (!grpcRes)
                        throw new Error(`Couldn't setup first round`);
                    //@ts-ignore deals
                    currentPlayersInTable = grpcRes.tableGameData.seats;
                    tableGameplayData =
                        yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['seats']);
                    if (!tableGameplayData) {
                        throw new Error(`Table data is not set correctly ${tableId}`);
                    }
                    newLogger_1.Logger.info(`Players playing after lockin period ${tableId} `, [tableGameplayData.seats]);
                    yield Promise.all([
                        tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameplayData),
                        events_2.eventStateManager.fireEvent(tableId, events_1.STATE_EVENTS.SNAPSHOT_TIMER),
                    ]);
                    newLogger_1.Logger.info('calling round start timer');
                    schedulerQueue_1.scheduler.addJob.roundStart(tableId, constants_1.NUMERICAL.TWO * constants_1.NUMERICAL.THOUSAND);
                    /**
                     * send collect boot socket room event to client
                     */
                    if (!(0, utils_1.isPointsRummyFormat)(tableConfigData.gameType)) {
                        const userIds = underscore_1.default.compact(underscore_1.default.pluck(currentPlayersInTable, '_id'));
                        socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.COLLECT_BOOT_VALUE_SOCKET_EVENT, {
                            tableId,
                            userIds,
                            bootValue: tableConfigData.bootValue,
                            totalBootValue: tableConfigData.bootValue * userIds.length,
                            currencyType: tableConfigData.currencyType,
                        });
                    }
                }
                else {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR player not found ${tableId}`);
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error in initializeGameplayForFirstRound ${error.message}`, [error]);
                yield cancelBattle_1.cancelBattle.cancelBattle(data.tableId, error);
            }
            finally {
                try {
                    if (lock && lock instanceof redlock_1.Lock) {
                        yield redlock_2.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in initializeGameplayForFirstRound; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on initializeGameplayForFirstRound: ${err}`, [err]);
                }
            }
        });
    }
}
exports.tableOperation = new TableOperation();
