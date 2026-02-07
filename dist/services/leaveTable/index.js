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
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const redisWrapper_1 = require("../../db/redisWrapper");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const turnHistory_1 = require("../../db/turnHistory");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const utils_1 = require("../../utils");
const redlock_2 = require("../../utils/lock/redlock");
const response_validator_1 = require("../../validators/response.validator");
const winner_1 = require("../finishEvents/winner");
const turn_1 = require("../gameplay/turn");
const schedulerQueue_1 = require("../schedulerQueue");
const underscore_1 = __importDefault(require("underscore"));
const events_1 = require("../../constants/events");
const events_2 = require("../../state/events");
const date_1 = require("../../utils/date");
const winnerPoints_1 = require("../finishEvents/winnerPoints");
const userService_1 = __importDefault(require("../../userService"));
const gameEndReasons_1 = require("../../constants/gameEndReasons");
const turnHistory_2 = require("../../utils/turnHistory");
const ShuffleOpenDeck_1 = require("../gameplay/ShuffleOpenDeck");
class LeaveTableHandler {
    main(data, userId, networkParams) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { tableId, reason } = data;
            let lock;
            try {
                if (!tableId) {
                    throw new Error('Table Id is required in leaveTablehandler');
                }
                let isDropNSwitch = true;
                if (!(data === null || data === void 0 ? void 0 : data.isDropNSwitch)) {
                    isDropNSwitch = false;
                    lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 2000);
                    newLogger_1.Logger.info(`Lock acquired, in leaveTable resource:, ${lock === null || lock === void 0 ? void 0 : lock.resource}`);
                }
                const tableConfigurationData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    '_id',
                    'currentRound',
                    'gameType',
                    'maximumSeat',
                    'minimumSeat',
                    'lobbyId',
                    'maximumPoints',
                    'currencyFactor',
                    'gameStartTimer',
                    'gameType',
                    'currencyFactor',
                    'isMultiBotEnabled'
                ]);
                const { currentRound, gameType, maximumSeat: maxPlayers, } = tableConfigurationData;
                const [tableGameplayData, playerGamePlayData, userInfo, currentRoundHistory,] = yield Promise.all([
                    tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                        'tableState',
                        'seats',
                        'noOfPlayers',
                        'tableState',
                        'currentTurn',
                        'opendDeck',
                        'pointsForRoundWinner',
                        'potValue',
                        'standupUsers',
                        'declarePlayer',
                    ]),
                    playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, [
                        'userId',
                        'isFirstTurn',
                        'seatIndex',
                        'tableSessionId',
                        'userStatus',
                        'dealPoint',
                        'points',
                        'winningCash',
                        'currentCards',
                        'groupingCards',
                    ]),
                    userProfile_1.userProfileService.getOrCreateUserDetailsById(userId),
                    turnHistory_1.turnHistoryService.getTurnHistory(tableId, currentRound),
                ]);
                newLogger_1.Logger.info(`leaving table  ${tableId} : ${userId} at ${tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.tableState}, reason: ${reason}`, [
                    tableConfigurationData,
                    tableGameplayData,
                    playerGamePlayData,
                ]);
                if (!tableGameplayData || !playerGamePlayData)
                    throw new Error(`TableGamePlay or PlayerGamePlay not found, ${tableId}`);
                if (!userInfo)
                    throw new Error('UserProfile not found');
                if (userInfo.isBot) {
                    newLogger_1.Logger.info(`updating userProfile in backend-service ${userId} ${tableId}`);
                }
                yield userService_1.default.updateProfile(userId, {
                    isPlaying: false,
                    currentMatchId: null,
                    currentLobbyId: 0
                });
                const leaveTableResponse = {
                    userId,
                    tableId,
                    exit: true,
                    availablePlayers: tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.noOfPlayers,
                    round: currentRound,
                    potValue: 0,
                    isSwitch: !!(reason === constants_1.LEAVE_TABLE_REASONS.SWITCH),
                    insufficentFund: !!(reason === constants_1.LEAVE_TABLE_REASONS.NO_BALANCE),
                    inGameSwitch: false,
                    tableState: tableGameplayData.tableState,
                };
                if (!tableGameplayData.seats.find((obj) => obj._id === userId) ||
                    (playerGamePlayData === null || playerGamePlayData === void 0 ? void 0 : playerGamePlayData.userStatus) === constants_1.PLAYER_STATE.LEFT) {
                    newLogger_1.Logger.info(`User is not playing in this table ${tableId} ${userId}`);
                    yield socketOperation_1.socketOperation.sendEventToClient(userInfo.socketId, Object.assign(Object.assign({}, leaveTableResponse), { potValue: tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.potValue }), constants_1.EVENTS.LEAVE_TABLE);
                    return { userId, tableId, exit: true };
                }
                const seatsClone = JSON.parse(JSON.stringify(tableGameplayData.seats));
                const safeStates = [
                    constants_1.TABLE_STATE.WAITING_FOR_PLAYERS,
                    constants_1.TABLE_STATE.ROUND_TIMER_STARTED,
                ];
                const canNotLeaveStates = [
                    constants_1.TABLE_STATE.LOCK_IN_PERIOD,
                    constants_1.TABLE_STATE.DECLARED,
                ];
                const { currentTurn, tableState, seats } = tableGameplayData;
                // if user already leave then can't leave again(pgp will be null)
                if (canNotLeaveStates.includes(tableState) ||
                    !playerGamePlayData) {
                    throw new Error(`Couldn't leave the table state ${tableState} ${tableId}`);
                }
                const { tableIds } = userInfo;
                if (reason == constants_1.LEAVE_TABLE_REASONS.ELIMINATED) {
                    yield this.updateUserLeftPGP(userId, tableId, currentRound);
                }
                if ((reason === constants_1.LEAVE_TABLE_REASONS.ELIMINATED ||
                    reason === constants_1.LEAVE_TABLE_REASONS.GRPC_FAILED) &&
                    !safeStates.includes(tableState)) {
                    // TODO: need to verify it's required or not
                    // Lib.Scheduler.cancelJob.cancelRoundStartTimer(tableId);
                    // Lib.Scheduler.cancelJob.cancelTableSnapshot(tableId);
                    yield this.updateTGPandPGPandUserProfile(userId, tableId, tableConfigurationData, tableGameplayData, userInfo, false, reason, { playerGamePlay: playerGamePlayData });
                }
                if (gameType === constants_1.RUMMY_TYPES.DEALS &&
                    maxPlayers > 2 &&
                    !safeStates.includes(tableState)) {
                    // flow for Deals 6P
                    userInfo.tableIds = tableIds.filter((t_id) => t_id !== tableId);
                    yield userProfile_1.userProfileService.setUserDetails(userId, userInfo);
                    // socketOperation.sendEventToClient(
                    //   userInfo.socketId,
                    //   {
                    //     ...leaveTableResponse,
                    //     availablePlayers: tableGameplayData?.noOfPlayers - 1,
                    //     potValue: tableGameplayData?.potValue[userInfo.id],
                    //   },
                    //   EVENTS.LEAVE_TABLE,
                    // );
                    // return { tableId, userId, exit: true };
                }
                let isDeckShuffled = false;
                // remove userId from standupUsers if standup user left
                if ((0, utils_1.isPointsRummyFormat)(gameType)) {
                    this.removeFromStandupUsers(tableGameplayData, userId, tableId, currentRound);
                }
                // first round, game did not start
                if (((0, utils_1.isPointsRummyFormat)(gameType) ||
                    currentRound === constants_1.NUMERICAL.ONE) &&
                    (safeStates.includes(tableState) ||
                        reason === constants_1.LEAVE_TABLE_REASONS.GRPC_FAILED)) {
                    yield this.updateTGPandPGPandUserProfile(userId, tableId, tableConfigurationData, tableGameplayData, userInfo, true, reason);
                    if ((0, utils_1.isPointsRummyFormat)(gameType)) {
                        yield this.managePlayerOnLeave(tableConfigurationData, tableGameplayData, isDeckShuffled, { userId });
                    }
                }
                else if (tableState === constants_1.TABLE_STATE.ROUND_STARTED) {
                    if (((_a = tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.closedDeck) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                        yield (0, ShuffleOpenDeck_1.shuffleOpenDeck)({
                            tableGamePlayData: tableGameplayData,
                            tableId,
                            currentRound,
                        });
                        isDeckShuffled = true;
                    }
                    const optionalObj = {};
                    // current turn is user's turn
                    if (currentTurn === userId) {
                        schedulerQueue_1.scheduler.cancelJob.playerTurnTimer(tableId, userId);
                        // picked one card;
                        if (playerGamePlayData &&
                            (playerGamePlayData === null || playerGamePlayData === void 0 ? void 0 : playerGamePlayData.currentCards.length) >
                                constants_1.NUMERICAL.THIRTEEN) {
                            const remainingCard = playerGamePlayData.currentCards.pop();
                            if (remainingCard && playerGamePlayData.groupingCards) {
                                const groupCards = (0, utils_1.removePickCardFromCards)(remainingCard, playerGamePlayData.groupingCards);
                                playerGamePlayData.groupingCards = groupCards;
                                const tableResponse = {
                                    tableId,
                                    userId,
                                    card: remainingCard,
                                };
                                (0, response_validator_1.validateThrowCardRoomRes)(tableResponse);
                                // throw card
                                socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.DISCARD_CARD_SOCKET_EVENT, tableResponse);
                            }
                            optionalObj.remainingCard = remainingCard;
                        }
                    }
                    let lostPoints = 0;
                    if ((0, utils_1.isPointsRummyFormat)(gameType)) {
                        // user can not leave below playerStates
                        const canNotLeavePlayerStates = [
                            constants_1.PLAYER_STATE.DROP,
                            constants_1.PLAYER_STATE.LOST,
                            constants_1.PLAYER_STATE.WATCHING,
                            constants_1.PLAYER_STATE.LEFT,
                        ];
                        if (playerGamePlayData &&
                            !canNotLeavePlayerStates.includes(playerGamePlayData.userStatus)) {
                            const leaveTableOnRoundStartedPoints = {
                                reason,
                                userInfo,
                                tableConfigurationData,
                                tableGameplayData,
                                playerGamePlay: playerGamePlayData,
                                currentRoundHistory,
                                isDropNSwitch,
                            };
                            ({ lostPoints } =
                                yield this.leaveTableOnRoundStartedPoints(leaveTableOnRoundStartedPoints));
                        }
                        optionalObj.canNotLeavePlayerStates =
                            canNotLeavePlayerStates;
                    }
                    optionalObj.playerGamePlay = playerGamePlayData;
                    optionalObj.lostPoints = lostPoints;
                    yield this.updateTGPandPGPandUserProfile(userId, tableId, tableConfigurationData, tableGameplayData, userInfo, false, reason, optionalObj);
                    const remainingPlayers = yield this.remainingPlayers(tableId, currentRound, seats);
                    leaveTableResponse.availablePlayers = remainingPlayers.length;
                    if ((remainingPlayers === null || remainingPlayers === void 0 ? void 0 : remainingPlayers.length) === constants_1.NUMERICAL.ONE) {
                        schedulerQueue_1.scheduler.cancelJob.playerTurnTimer(tableId, tableGameplayData.currentTurn);
                        schedulerQueue_1.scheduler.cancelJob.initialTurnSetup(tableId, tableGameplayData.currentTurn);
                        if ((0, utils_1.isPointsRummyFormat)(gameType)) {
                            yield winnerPoints_1.winnerPoints.handleWinnerPoints(tableId, currentRound, (_b = remainingPlayers[0]) === null || _b === void 0 ? void 0 : _b.userId);
                        }
                        else {
                            yield winner_1.winner.handleWinner({ userId }, tableConfigurationData, tableGameplayData);
                        }
                    }
                    else {
                        yield this.managePlayerOnLeave(tableConfigurationData, tableGameplayData, isDeckShuffled, { userId });
                    }
                    const currentTurnData = {
                        points: constants_1.NUMERICAL.EIGHTY,
                        turnStatus: constants_1.TURN_HISTORY.LEFT,
                    };
                    yield (0, turnHistory_2.UpdateTurnDetails)(tableId, currentRound, currentTurnData);
                }
                else if ((0, utils_1.isPointsRummyFormat)(gameType) &&
                    tableState === constants_1.TABLE_STATE.WINNER_DECLARED) {
                    yield this.updateTGPandPGPandUserProfile(userId, tableId, tableConfigurationData, tableGameplayData, userInfo, false, reason, { playerGamePlay: playerGamePlayData });
                }
                const updatedTableGamePlayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['potValue', 'noOfPlayers']);
                if (!updatedTableGamePlayData) {
                    throw new Error(`Table gameplay not available ${tableId} ${currentRound}`);
                }
                leaveTableResponse.tableState = tableGameplayData.tableState;
                leaveTableResponse.availablePlayers =
                    updatedTableGamePlayData.noOfPlayers;
                let userIds = underscore_1.default.compact(underscore_1.default.pluck(seatsClone, '_id'));
                // while switch table don't send leave table to that user for points
                if (reason === constants_1.LEAVE_TABLE_REASONS.SWITCH)
                    userIds = userIds.filter((id) => id !== userId);
                const playersProfileData = yield Promise.all(userIds.map((userId) => userProfile_1.userProfileService.getUserDetailsById(userId)));
                const userSocktMap = {};
                playersProfileData.forEach((playerProfileData) => {
                    if (playerProfileData
                    // &&!(
                    //   reason === LEAVE_TABLE_REASONS.ELIMINATED &&
                    //   playerProfileData?.id === userId
                    // )
                    ) {
                        if (playerProfileData) {
                            userSocktMap[playerProfileData.id] =
                                playerProfileData.socketId;
                        }
                    }
                });
                // for points switch button
                if ((0, utils_1.isPointsRummyFormat)(gameType) &&
                    !safeStates.includes(tableState)) {
                    leaveTableResponse.inGameSwitch = true;
                }
                if (reason === constants_1.LEAVE_TABLE_REASONS.NO_BALANCE) {
                    leaveTableResponse.exit = false;
                }
                const promiseLeaveTable = [];
                Object.keys(userSocktMap).map((userId) => {
                    promiseLeaveTable.push(socketOperation_1.socketOperation.sendEventToClient(userSocktMap[userId], Object.assign(Object.assign({}, leaveTableResponse), { potValue: updatedTableGamePlayData === null || updatedTableGamePlayData === void 0 ? void 0 : updatedTableGamePlayData.potValue }), constants_1.EVENTS.LEAVE_TABLE));
                });
                yield Promise.all(promiseLeaveTable);
                if (!(0, utils_1.isPointsRummyFormat)(gameType)) {
                    const remainingPlayers = yield this.remainingPlayers(tableId, currentRound, tableGameplayData.seats);
                    if ((remainingPlayers === null || remainingPlayers === void 0 ? void 0 : remainingPlayers.length) === constants_1.NUMERICAL.ZERO) {
                        const key = `${constants_1.REDIS_CONSTANTS.QUEUE}:${(0, utils_1.getIdPrefix)(gameType)}:${tableConfigurationData.lobbyId}`;
                        yield (0, redisWrapper_1.removeValueFromSet)(key, tableId);
                        newLogger_1.Logger.info(`remove table from queue >> tableId: ${tableId}`);
                    }
                }
                yield Promise.all([
                    events_2.eventStateManager.fireEventUser(tableId, userId, events_1.USER_EVENTS.LEFT, (networkParams === null || networkParams === void 0 ? void 0 : networkParams.timeStamp) || date_1.dateUtils.getCurrentEpochTime()),
                ]);
                socketOperation_1.socketOperation.removeClientFromRoom(tableId, userInfo.socketId);
                return { tableId, userId, exit: true };
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR LeaveTableHandler.main table ${tableId} user ${userId}, ${error.message}`, [error]);
                throw error;
            }
            finally {
                try {
                    if (lock && lock instanceof redlock_1.Lock) {
                        yield redlock_2.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in leaveTable; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on leaveTable: ${err}`);
                }
            }
        });
    }
    managePlayerOnLeave(tableConfigurationData, tableGameplayData, isDeckShuffled, playerGameData) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { _id: tableId, currentRound, gameType, lobbyId, } = tableConfigurationData;
                const { noOfPlayers, tableState, currentTurn } = tableGameplayData;
                const { userId } = playerGameData;
                newLogger_1.Logger.info(`managePlayerOnLeave: ${tableId}, noOfPlayers: ${noOfPlayers}`, [tableGameplayData]);
                const remainingPlayers = yield this.remainingPlayers(tableId, currentRound, tableGameplayData.seats);
                newLogger_1.Logger.info(`managePlayerOnLeave: ${tableId}, remainingPlayers:`, [remainingPlayers]);
                if ((0, utils_1.isPointsRummyFormat)(gameType) &&
                    (remainingPlayers === null || remainingPlayers === void 0 ? void 0 : remainingPlayers.length) === constants_1.NUMERICAL.ZERO) {
                    // cancel both the starting timer
                    schedulerQueue_1.scheduler.cancelJob.tableStart(tableId);
                    schedulerQueue_1.scheduler.cancelJob.roundStart(tableId);
                    if ((0, utils_1.isPointsRummyFormat)(gameType) &&
                        ((_a = tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.standupUsers) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                        const key = `${constants_1.REDIS_CONSTANTS.QUEUE}:${(0, utils_1.getIdPrefix)(gameType)}:${lobbyId}`;
                        yield (0, redisWrapper_1.removeValueFromSet)(key, tableId);
                        newLogger_1.Logger.info(`In managePlayerOnLeave >> remove table from queue >> tableId: ${tableId}`);
                    }
                }
                else if ((0, utils_1.isPointsRummyFormat)(gameType) &&
                    (remainingPlayers === null || remainingPlayers === void 0 ? void 0 : remainingPlayers.length) === constants_1.NUMERICAL.ONE &&
                    tableState === constants_1.TABLE_STATE.ROUND_STARTED) {
                    yield winnerPoints_1.winnerPoints.handleWinnerPoints(tableId, currentRound, (_b = remainingPlayers[0]) === null || _b === void 0 ? void 0 : _b.userId);
                }
                else if (
                // noOfPlayers === NUMERICAL.ONE &&
                !(0, utils_1.isPointsRummyFormat)(gameType) &&
                    (remainingPlayers === null || remainingPlayers === void 0 ? void 0 : remainingPlayers.length) === constants_1.NUMERICAL.ONE &&
                    (tableState === constants_1.TABLE_STATE.ROUND_STARTED ||
                        tableState === constants_1.TABLE_STATE.DECLARED ||
                        (tableState === constants_1.TABLE_STATE.ROUND_TIMER_STARTED &&
                            currentRound > 1))) {
                    winner_1.winner.handleWinner(playerGameData, tableConfigurationData, tableGameplayData);
                }
                else if (tableState === constants_1.TABLE_STATE.ROUND_STARTED &&
                    currentTurn === userId) {
                    yield (0, turn_1.changeTurn)(tableId);
                }
                return true;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR LeaveTableHandler.managePlayerOnLeave ${error.message} `, [error]);
                throw error;
            }
        });
    }
    remainingPlayers(tableId, currentRound, seats) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const remainingPlayersPgp = [];
                (yield Promise.all(seats.map((e) => {
                    return playerGameplay_1.playerGameplayService.getPlayerGameplay(e._id, tableId, currentRound, ['userId', 'userStatus']);
                }))).forEach((player) => {
                    if ((player === null || player === void 0 ? void 0 : player.userStatus) === constants_1.PLAYER_STATE.PLAYING) {
                        remainingPlayersPgp.push(player);
                    }
                });
                return remainingPlayersPgp;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR LeaveTableHandler.remainingPlayers ${error.message} `, [error]);
                throw error;
            }
        });
    }
    updateUserLeftPGP(userId, tableId, roundNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const playerGamePlayData = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, roundNumber, ['userId', 'userStatus']);
            if (!playerGamePlayData)
                throw Error(`Player Game Play data not found for userId: ${userId} and tableId: ${tableId}`);
            playerGamePlayData.userStatus = constants_1.PLAYER_STATE.LEFT;
            yield playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, roundNumber, playerGamePlayData);
        });
    }
    updateTGPandPGPandUserProfile(userId, tableId, tableConfigurationData, tableGameplayData, userInfo, gameDidNotStart, reason, optionalObj) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { currentRound, minimumSeat, lobbyId, maximumPoints, currencyFactor, gameType, isMultiBotEnabled } = tableConfigurationData;
                const { tableIds } = userInfo;
                if (tableGameplayData.noOfPlayers)
                    tableGameplayData.noOfPlayers -= 1;
                newLogger_1.Logger.info(`Updating no of players ${JSON.stringify(tableGameplayData)}`);
                // leave before start game
                if (gameDidNotStart) {
                    newLogger_1.Logger.info(`TGP seats >> ${tableId}, ${(_a = tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.seats) === null || _a === void 0 ? void 0 : _a.length}`, [tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.seats, `minimum seats ${minimumSeat}`]);
                    if (tableGameplayData.seats.length <= minimumSeat) {
                        tableGameplayData.tableState =
                            constants_1.TABLE_STATE.WAITING_FOR_PLAYERS;
                        yield schedulerQueue_1.scheduler.cancelJob.tableStart(tableId);
                        const remainingSeats = tableGameplayData.seats.filter((seat) => seat._id !== userId);
                        const remainingUser = (_b = remainingSeats[0]) === null || _b === void 0 ? void 0 : _b._id; // only one user will be present
                        if (remainingSeats.length <= constants_1.NUMERICAL.ONE && !isMultiBotEnabled) {
                            yield schedulerQueue_1.scheduler.cancelJob.bot(tableId, currentRound);
                            if (remainingSeats.length) {
                                const userDetail = yield userProfile_1.userProfileService.getUserDetailsById(remainingSeats[0]['_id']);
                                if (userDetail && userDetail.isBot && userDetail.id) {
                                    this.main({
                                        tableId,
                                        reason: constants_1.LEAVE_TABLE_REASONS.ELIMINATED,
                                    }, userDetail.id);
                                }
                                else if (!(userDetail === null || userDetail === void 0 ? void 0 : userDetail.isBot)) {
                                    yield schedulerQueue_1.scheduler.addJob.bot(tableId, currentRound, constants_1.BOT_CONFIG.BOT_WAITING_TIME_IN_MS);
                                }
                            }
                        }
                        if (remainingUser) {
                            const lobbyConfig = yield tableConfiguration_1.tableConfigurationService.getLobbyDetailsForMM(lobbyId);
                            if (lobbyConfig) {
                                tableConfigurationData.gameStartTimer =
                                    lobbyConfig.gameStartTimer;
                                yield tableConfiguration_1.tableConfigurationService.setTableConfiguration(tableId, tableConfigurationData);
                            }
                        }
                        tableGameplayData.seats = remainingSeats.filter((e) => e._id);
                    }
                    // currentRound condition not required for points rummy
                    if ((0, utils_1.isPointsRummyFormat)(tableConfigurationData.gameType)) {
                        let seatedPlayerCount = 0;
                        tableGameplayData.seats.forEach((e) => {
                            if (e._id === userId) {
                                e._id = null;
                            }
                            else if (e._id)
                                seatedPlayerCount += 1;
                        });
                        tableGameplayData.noOfPlayers = seatedPlayerCount;
                        if (seatedPlayerCount < minimumSeat) {
                            // change table state
                            tableGameplayData.tableState =
                                constants_1.TABLE_STATE.WAITING_FOR_PLAYERS;
                            // cancel round start timmer
                            yield schedulerQueue_1.scheduler.cancelJob.tableStart(tableId);
                        }
                    }
                    else {
                        tableGameplayData.seats.forEach((e) => {
                            if (e._id === userId && currentRound === 1) {
                                e._id = null;
                            }
                        });
                    }
                    const key = `${(0, utils_1.getIdPrefix)(tableConfigurationData.gameType)}:${lobbyId}`;
                    yield (0, redisWrapper_1.pushIntoQueue)(key, tableId);
                    playerGameplay_1.playerGameplayService.deletePlayerGamePlay(userId, tableId, currentRound);
                }
                else {
                    // leave in game
                    const playerGamePlayData = (optionalObj === null || optionalObj === void 0 ? void 0 : optionalObj.playerGamePlay) || {};
                    if (optionalObj === null || optionalObj === void 0 ? void 0 : optionalObj.remainingCard) {
                        tableGameplayData.opendDeck.push(optionalObj.remainingCard);
                    }
                    if (tableConfigurationData.gameType === constants_1.RUMMY_TYPES.DEALS) {
                        const cardPoints = constants_1.POINTS.MANUAL_LEAVE_PENALTY_POINTS;
                        (0, utils_1.deductScoreForDeals)(playerGamePlayData, tableGameplayData, cardPoints);
                    }
                    else if ((0, utils_1.isPointsRummyFormat)(tableConfigurationData.gameType) &&
                        tableGameplayData.tableState ===
                            constants_1.TABLE_STATE.ROUND_STARTED &&
                        !(optionalObj === null || optionalObj === void 0 ? void 0 : optionalObj.canNotLeavePlayerStates.includes(playerGamePlayData === null || playerGamePlayData === void 0 ? void 0 : playerGamePlayData.userStatus))) {
                        const totalPoints = (optionalObj === null || optionalObj === void 0 ? void 0 : optionalObj.lostPoints) || constants_1.POINTS.MAX_DEADWOOD_POINTS;
                        Object.keys(tableGameplayData.potValue).forEach((userId) => {
                            const pointsAsPerCF = (0, utils_1.roundInt)(currencyFactor * totalPoints, 2);
                            // in case of points
                            if (!tableGameplayData.potValue) {
                                tableGameplayData.potValue = 0;
                            }
                            tableGameplayData.potValue += pointsAsPerCF;
                        });
                        const pointsAsPerCF = (0, utils_1.roundInt)(currencyFactor * totalPoints, 2);
                        tableGameplayData.totalPlayerPoints += totalPoints;
                        playerGamePlayData.points = totalPoints;
                        playerGamePlayData.winningCash = -pointsAsPerCF;
                    }
                    else if (tableConfigurationData.gameType === constants_1.RUMMY_TYPES.POOL) {
                        tableGameplayData.totalPlayerPoints += maximumPoints;
                        playerGamePlayData.points = maximumPoints;
                        playerGamePlayData.dealPoint = maximumPoints;
                    }
                    playerGamePlayData.userStatus = constants_1.PLAYER_STATE.LEFT;
                    playerGamePlayData.gameEndReason =
                        gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.EXIT;
                    yield playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGamePlayData);
                }
                userInfo.tableIds = tableIds.filter((t_id) => t_id !== tableId);
                if ((0, utils_1.isPointsRummyFormat)(tableConfigurationData.gameType) &&
                    reason !== constants_1.LEAVE_TABLE_REASONS.SWITCH) {
                    userInfo.userTablesCash = userInfo.userTablesCash.filter((userTableCash) => userTableCash.tableId !== tableId);
                }
                yield Promise.all([
                    userProfile_1.userProfileService.setUserDetails(userId, userInfo),
                    tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameplayData),
                ]);
                return tableGameplayData;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR LeaveTableHandler.updateRedis ${error.message} `, [error]);
                throw error;
            }
        });
    }
    // [POINTS] remove userId from standupUsers if standup user left
    removeFromStandupUsers(tableGameplayData, userId, tableId, currentRound) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const filteredStandupUsers = (_a = tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.standupUsers) === null || _a === void 0 ? void 0 : _a.filter((item) => `${item._id}` !== `${userId}`);
            if ((filteredStandupUsers === null || filteredStandupUsers === void 0 ? void 0 : filteredStandupUsers.length) !==
                ((_b = tableGameplayData === null || tableGameplayData === void 0 ? void 0 : tableGameplayData.standupUsers) === null || _b === void 0 ? void 0 : _b.length)) {
                tableGameplayData.standupUsers = filteredStandupUsers;
                yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameplayData);
            }
        });
    }
    leaveTableOnRoundStartedPoints(userCashPointsData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { reason, userInfo, tableConfigurationData, tableGameplayData, playerGamePlay, currentRoundHistory, isDropNSwitch, } = userCashPointsData;
            const { _id: tableId, currentRound, currencyFactor, } = tableConfigurationData;
            newLogger_1.Logger.info(`---leaveTableOnRoundStartedPoints--ROUND_STARTED--- ${tableId}`);
            let lostPoints = 0;
            if (playerGamePlay &&
                playerGamePlay.userStatus !== constants_1.PLAYER_STATE.DROP &&
                playerGamePlay.userStatus !== constants_1.PLAYER_STATE.LOST &&
                playerGamePlay.userStatus !== constants_1.PLAYER_STATE.WATCHING &&
                playerGamePlay.userStatus !== constants_1.PLAYER_STATE.LEFT) {
                const { userId } = playerGamePlay;
                lostPoints = isDropNSwitch
                    ? (0, utils_1.getDropPoints)(playerGamePlay.isFirstTurn, tableConfigurationData.maximumPoints, tableConfigurationData.gameType, tableConfigurationData.maximumSeat)
                    : constants_1.POINTS.MAX_DEADWOOD_POINTS;
                const pointsAsPerCF = (0, utils_1.roundInt)(currencyFactor * lostPoints, 2);
                if (reason !== constants_1.LEAVE_TABLE_REASONS.GRPC_FAILED) {
                    const gameDetails = (0, utils_1.formatGameDetails)(currentRound, tableGameplayData, currentRoundHistory);
                    const lostUserData = {
                        si: playerGamePlay.seatIndex,
                        userId: userInfo.id,
                        sessionId: playerGamePlay.tableSessionId,
                        score: -lostPoints,
                        gameEndReason: reason === constants_1.GAME_END_REASONS.SWITCH
                            ? constants_1.GAME_END_REASONS.SWITCH
                            : constants_1.GAME_END_REASONS.LEFT,
                        decimalScore: (0, utils_1.roundInt)(-lostPoints, 2),
                        roundEndReason: gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.EXIT,
                        gameType: tableConfigurationData.gameType,
                        lobbyId: tableConfigurationData.lobbyId[userInfo.id],
                        tableId,
                        gameDetails,
                        currentRound,
                        startingUsersCount: tableGameplayData.noOfPlayers,
                    };
                    newLogger_1.Logger.info(`UserData for leaveTable request on table: ${tableId}`, [lostUserData]);
                }
            }
            return { lostPoints, error: false };
        });
    }
}
module.exports = new LeaveTableHandler();
