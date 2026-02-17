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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.winnerPoints = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const underscore_1 = __importDefault(require("underscore"));
const constants_1 = require("../../constants");
const events_1 = require("../../constants/events");
const playerGameplay_1 = require("../../db/playerGameplay");
const redisWrapper_1 = require("../../db/redisWrapper");
const roundScoreBoard_1 = require("../../db/roundScoreBoard");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const index_1 = require("../../db/turnHistory/index");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const events_2 = require("../../state/events");
const utils_1 = require("../../utils");
const date_1 = require("../../utils/date");
const errors_1 = require("../../utils/errors");
const getPlayingUserInRound_1 = require("../../utils/getPlayingUserInRound");
const redlock_2 = require("../../utils/lock/redlock");
const turnHistory_1 = require("../../utils/turnHistory");
const cancelBattle_1 = require("../gameplay/cancelBattle");
const cardHandler_1 = require("../gameplay/cardHandler");
const round_1 = require("../gameplay/round");
const leaveDisconnectedUsers_1 = require("../leaveTable/leaveDisconnectedUsers");
const index_2 = require("../schedulerQueue/index");
const winner_1 = require("./winner");
class WinnerPoints {
    declareWinner(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('declareWinner: ', tableId);
                const tableData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, ['currentRound', 'currencyFactor']);
                const { currentRound, currencyFactor } = tableData;
                const [tableGameData] = yield Promise.all([
                    tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                        'totalPlayerPoints',
                        'potValue',
                        'declarePlayer',
                        'seats',
                        'tableState',
                        'papluCard'
                    ]),
                    index_1.turnHistoryService.getTurnHistory(tableId, currentRound),
                ]);
                if (!tableData || !tableGameData) {
                    throw new Error(`tableData or tableGameData not set in declareWinner`);
                }
                if (tableGameData.tableState === constants_1.TABLE_STATE.WINNER_DECLARED) {
                    newLogger_1.Logger.info('declareWinner: table already finished ', [
                        tableId,
                        tableData,
                        tableGameData,
                    ]);
                    return;
                }
                const playersGameData = yield Promise.all(tableGameData.seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, ['userId', 'userStatus', 'points', 'winningCash', 'cards'])));
                newLogger_1.Logger.info(`declareWinner: playersGameData ${tableId} `, [
                    playersGameData,
                ]);
                const { declarePlayer } = tableGameData;
                let totalPlayer = 0;
                playersGameData.map((player) => __awaiter(this, void 0, void 0, function* () {
                    if (declarePlayer !== player.userId) {
                        const playerData = player;
                        if (playerData.userStatus === constants_1.PLAYER_STATE.FINISH) {
                            let { points } = playerData;
                            let pointsAsPerCF = currencyFactor * points;
                            pointsAsPerCF = (0, utils_1.roundInt)(pointsAsPerCF, 2);
                            if (points != 0) {
                                console.log(playerData.cards, "---playerData.cards---", tableGameData.papluCard);
                                for (let i = 0; i < playerData.cards.length; i++) {
                                    if (playerData.cards[i].includes(tableGameData.papluCard)) {
                                        points += 10;
                                    }
                                }
                            }
                            playerData.points = points;
                            playerData.winningCash = -pointsAsPerCF;
                            tableGameData.potValue += pointsAsPerCF;
                            tableGameData.totalPlayerPoints += points;
                            yield playerGameplay_1.playerGameplayService.setPlayerGameplay(playerData.userId, tableId, currentRound, playerData);
                        }
                    }
                    totalPlayer += 1;
                    if (playersGameData.length === totalPlayer) {
                        yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameData);
                        yield this.handleWinnerPoints(tableId, currentRound, declarePlayer);
                    }
                }));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error from declareWinner: ${tableId}`, [error]);
                if (error instanceof errors_1.CancelBattleError) {
                    yield cancelBattle_1.cancelBattle.cancelBattle(tableId, error);
                }
                throw error;
            }
        });
    }
    handleWinnerPoints(tableId, currentRound, declarePlayer) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [tableConfigData, tableGameData, // tableGamePlayData,
                winnerPgpData,] = yield Promise.all([
                    tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                        '_id',
                        'lobbyId',
                        'gameType',
                        'currentRound',
                        'rakePercentage',
                        'isNewGameTableUI',
                    ]),
                    tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                        'tableState',
                        'trumpCard',
                        'opendDeck',
                        'seats',
                        'potValue',
                        'closedDeck'
                    ]),
                    playerGameplay_1.playerGameplayService.getPlayerGameplay(declarePlayer, tableId, currentRound, [
                        'userId',
                        'seatIndex',
                        'groupingCards',
                        'currentCards',
                        'dealPoint',
                    ]),
                ]);
                newLogger_1.Logger.info(`handleWinnerPoints for table ${tableId} - ${currentRound} `, [winnerPgpData === null || winnerPgpData === void 0 ? void 0 : winnerPgpData.dealPoint]);
                const { potValue } = tableGameData;
                const seats = tableGameData.seats.filter((e) => e._id !== null);
                try {
                    yield index_2.scheduler.cancelJob.botTurn(tableId, declarePlayer);
                }
                catch (error) {
                    newLogger_1.Logger.error(`botTurn cancel for ${tableId} ${declarePlayer}`);
                }
                // playerList
                const playersGameData = yield Promise.all(seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, [
                    'userId',
                    'userStatus',
                    'groupingCards',
                    'cardPoints',
                    'meld',
                    'dealPoint',
                    'points',
                ])));
                yield this.updateRoundEndHistoryPoints(playersGameData, currentRound, tableId, winnerPgpData.userId, tableGameData.trumpCard, tableGameData.closedDeck, tableGameData.opendDeck[tableGameData.opendDeck.length - 1]);
                tableGameData.tableState = constants_1.TABLE_STATE.WINNER_DECLARED;
                yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameData);
                const playersInfoDataArr = (yield Promise.all(playersGameData.map((p) => __awaiter(this, void 0, void 0, function* () {
                    return userProfile_1.userProfileService.getUserDetailsById(p.userId);
                })))).filter(Boolean);
                newLogger_1.Logger.info(`Player profiles ${tableId}`, [playersInfoDataArr]);
                const userSessionIds = {};
                playersGameData.forEach((p) => __awaiter(this, void 0, void 0, function* () {
                    userSessionIds[p.userId] = tableId;
                }));
                const grpcFinishBattleResponse = yield winner_1.winner.grpcCallForRoundFinish(tableConfigData, tableGameData, playersGameData, winnerPgpData, true, // isFinalBattle,
                playersGameData, playersInfoDataArr);
                const pointsAsPerCF = (0, utils_1.roundInt)(potValue - (potValue * tableConfigData.rakePercentage) / 100, 2);
                winnerPgpData.winningCash = pointsAsPerCF;
                yield playerGameplay_1.playerGameplayService.setPlayerGameplay(winnerPgpData.userId, tableId, currentRound, winnerPgpData);
                playersGameData.forEach((player) => __awaiter(this, void 0, void 0, function* () {
                    var _c;
                    // affect for finish/playing status only
                    if (player.userStatus !== constants_1.PLAYER_STATE.FINISH &&
                        player.userStatus !== constants_1.PLAYER_STATE.PLAYING)
                        return;
                    const profileData = yield userProfile_1.userProfileService.getUserDetailsById(player.userId);
                    const grpcPlayerData = grpcFinishBattleResponse === null || grpcFinishBattleResponse === void 0 ? void 0 : grpcFinishBattleResponse.playersData.find((p) => p.userId === (player === null || player === void 0 ? void 0 : player.userId));
                    const userTableRummyWallet = (_c = grpcPlayerData === null || grpcPlayerData === void 0 ? void 0 : grpcPlayerData.cashWinnings) === null || _c === void 0 ? void 0 : _c.amount;
                    yield (0, utils_1.setUserCash)(tableId, userTableRummyWallet, 'Game Win/Lost', profileData, !!tableConfigData.isNewGameTableUI);
                }));
                if (((_a = winnerPgpData === null || winnerPgpData === void 0 ? void 0 : winnerPgpData.currentCards) === null || _a === void 0 ? void 0 : _a.length) > 13) {
                    const remainingCard = winnerPgpData.currentCards.pop();
                    if (remainingCard) {
                        tableGameData.opendDeck.push(remainingCard);
                        winnerPgpData.groupingCards = (0, utils_1.removePickCardFromCards)(remainingCard, winnerPgpData.groupingCards);
                        yield playerGameplay_1.playerGameplayService.setPlayerGameplay(winnerPgpData.userId, tableId, currentRound, winnerPgpData);
                    }
                }
                // calling again since we updated the winningCash of winner
                const updatedPlayerList = yield Promise.all(seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, [
                    'userId',
                    'meld',
                    'groupingCards',
                    'userStatus',
                    'winLoseStatus',
                    'points',
                    'tenant',
                    'seatIndex',
                ])));
                const playerPgpList = underscore_1.default.clone(updatedPlayerList);
                for (let i = 0; i < playerPgpList.length; i++) {
                    for (let j = 0; j < playerPgpList.length - i - 1; j++) {
                        if (playerPgpList[j].points > playerPgpList[j + 1].points) {
                            const temp = underscore_1.default.clone(playerPgpList[j]);
                            playerPgpList[j] = underscore_1.default.clone(playerPgpList[j + 1]);
                            playerPgpList[j + 1] = underscore_1.default.clone(temp);
                        }
                    }
                }
                const scoreboardData = [];
                for (let k = 0; k < playerPgpList.length; k++) {
                    playerPgpList[k].winLoseStatus =
                        playerPgpList[k].seatIndex === winnerPgpData.seatIndex
                            ? constants_1.PLAYER_STATUS.WINNER
                            : constants_1.PLAYER_STATUS.LOOSER;
                    scoreboardData.push(playerPgpList[k]);
                }
                const playersProfileData = yield Promise.all(playersGameData.map((e) => userProfile_1.userProfileService.getUserDetailsById(e === null || e === void 0 ? void 0 : e.userId)));
                const winnerDeclarePlayerInfo = [];
                const scoreBoardPlayerInfo = [];
                for (let i = 0; i < scoreboardData.length; i++) {
                    const playerData = scoreboardData[i];
                    if (playerData) {
                        const profileData = playersProfileData.find((e) => e.id === (playerData === null || playerData === void 0 ? void 0 : playerData.userId));
                        const meldLabel = cardHandler_1.cardHandler.labelTheMeld({
                            meld: playerData === null || playerData === void 0 ? void 0 : playerData.meld,
                            cardsGroup: playerData === null || playerData === void 0 ? void 0 : playerData.groupingCards,
                        });
                        const grpcPlayerData = grpcFinishBattleResponse === null || grpcFinishBattleResponse === void 0 ? void 0 : grpcFinishBattleResponse.playersData.find((p) => p.userId === (playerData === null || playerData === void 0 ? void 0 : playerData.userId));
                        // for new gameTableUI
                        // when 2P available at last then change the staus playing to finish to show cards
                        const userStatus = (playerData === null || playerData === void 0 ? void 0 : playerData.userStatus) === constants_1.PLAYER_STATE.PLAYING
                            ? constants_1.PLAYER_STATE.FINISH
                            : playerData === null || playerData === void 0 ? void 0 : playerData.userStatus;
                        const winLoseStatus = playerData === null || playerData === void 0 ? void 0 : playerData.winLoseStatus; // for old one
                        const totalPoints = playerData === null || playerData === void 0 ? void 0 : playerData.points;
                        const userCashObj = ((profileData === null || profileData === void 0 ? void 0 : profileData.userTablesCash) &&
                            (profileData === null || profileData === void 0 ? void 0 : profileData.userTablesCash.find((utc) => utc.tableId === tableId))) || { userCash: 0 };
                        winnerDeclarePlayerInfo.push({
                            userId: playerData === null || playerData === void 0 ? void 0 : playerData.userId,
                            status: winLoseStatus,
                            userCash: userCashObj === null || userCashObj === void 0 ? void 0 : userCashObj.userCash,
                        });
                        scoreBoardPlayerInfo.push({
                            userId: playerData === null || playerData === void 0 ? void 0 : playerData.userId,
                            username: (profileData === null || profileData === void 0 ? void 0 : profileData.userName) || '',
                            profilePicture: (profileData === null || profileData === void 0 ? void 0 : profileData.avatarUrl) || '',
                            userCash: userCashObj === null || userCashObj === void 0 ? void 0 : userCashObj.userCash,
                            status: winLoseStatus,
                            userStatus,
                            totalPoints: totalPoints,
                            points: playerData === null || playerData === void 0 ? void 0 : playerData.points,
                            meld: meldLabel,
                            group: playerData === null || playerData === void 0 ? void 0 : playerData.groupingCards,
                            isRebuyApplicable: grpcPlayerData === null || grpcPlayerData === void 0 ? void 0 : grpcPlayerData.isPlayAgain,
                            canPlayAgain: grpcPlayerData === null || grpcPlayerData === void 0 ? void 0 : grpcPlayerData.isPlayAgain,
                            rank: (grpcPlayerData === null || grpcPlayerData === void 0 ? void 0 : grpcPlayerData.rank) || 0,
                            winAmount: ((_b = grpcPlayerData === null || grpcPlayerData === void 0 ? void 0 : grpcPlayerData.cashWinnings) === null || _b === void 0 ? void 0 : _b.amount) || 0,
                            tenant: playerData.tenant,
                        });
                    }
                }
                const scoreBoardData = {
                    tableId,
                    potValue: pointsAsPerCF,
                    tableState: tableGameData.tableState,
                    wildCard: tableGameData.trumpCard,
                    papluCard: tableGameData.papluCard,
                    winnerUserId: winnerPgpData.userId,
                    playerInfo: scoreBoardPlayerInfo,
                };
                yield roundScoreBoard_1.roundScoreBoardService.setRoundScoreBoard(tableId, currentRound, scoreBoardData);
                const winnerDeclareData = {
                    tableId,
                    potValue,
                    tableState: tableGameData.tableState,
                    playerInfo: winnerDeclarePlayerInfo,
                };
                socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.WINNER_DECLARE, winnerDeclareData);
                index_2.scheduler.addJob.scoreBoard(tableId, currentRound, updatedPlayerList, grpcFinishBattleResponse, tableConfigData === null || tableConfigData === void 0 ? void 0 : tableConfigData.isNewGameTableUI, true);
                for (let i = 0; i < playersGameData.length; i++) {
                    const playerData = playersGameData[i];
                    if (!playerData)
                        continue;
                    const { userId } = playerData;
                    // instrumentation call
                    // userPlayedGame(
                    //   scoreBoardPlayerInfo,
                    //   userId,
                    //   playersProfileData,
                    //   tableConfigData,
                    //   tableGameData,
                    //   playerData,
                    //   winnerPgpData.userId,
                    // );
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error on Handle Winner Points: ${tableId}`, [
                    error,
                ]);
                if (error instanceof errors_1.CancelBattleError) {
                    yield cancelBattle_1.cancelBattle.cancelBattle(tableId, error);
                }
            }
        });
    }
    updateRoundEndHistoryPoints(scoreboardData, currentRound, tableId, winnerId, trumpCard, closedDeck, openTopCard) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let currentRoundHistory = yield index_1.turnHistoryService.getTurnHistory(tableId, currentRound);
                const userFinalStateTurnDetails = [];
                let length = userFinalStateTurnDetails.length + 1;
                scoreboardData.forEach((user) => {
                    const cardState = user.groupingCards.toString();
                    const historyObj = {
                        turnNo: length,
                        userId: user.userId,
                        turnStatus: String(user.userStatus).toUpperCase(),
                        startState: cardState,
                        cardPicked: '',
                        cardPickSource: '',
                        cardDiscarded: '',
                        endState: cardState,
                        createdOn: new Date().toISOString(),
                        points: user.cardPoints,
                        sortedStartState: (0, turnHistory_1.sortedCards)(user.groupingCards, user.meld || []),
                        sortedEndState: (0, turnHistory_1.sortedCards)(user.groupingCards, user.meld || []),
                        isBot: user.isBot,
                        wildCard: trumpCard,
                        closedDeck: closedDeck,
                        openedDeckTop: openTopCard
                    };
                    userFinalStateTurnDetails.push(historyObj);
                    length += 1;
                });
                if (!currentRoundHistory) {
                    const [tableConfigData, tableGameData] = yield Promise.all([
                        tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                            'currentRound',
                        ]),
                        tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['_id', 'trumpCard']),
                    ]);
                    if (!tableGameData)
                        throw new Error(`Table gameplay not set for ${tableId}`);
                    currentRoundHistory =
                        index_1.turnHistoryService.getDefaultCurrentRoundTurnHistoryData(tableConfigData, tableGameData);
                    yield index_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory);
                }
                currentRoundHistory.userFinalStateTurnDetails =
                    userFinalStateTurnDetails;
                currentRoundHistory.winnerId = winnerId;
                newLogger_1.Logger.debug(`updateRoundEndHistoryPoints: ${tableId}`, [
                    'currentRoundHistory',
                    currentRoundHistory,
                ]);
                yield index_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory);
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR err on updateRoundEndHistoryPoints ${tableId}`, [
                    error,
                ]);
            }
        });
    }
    handleRoundFinishPoints(tableId, currentRound, finalDataGrpc) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (Object.keys(finalDataGrpc).length === 0 ||
                !(finalDataGrpc === null || finalDataGrpc === void 0 ? void 0 : finalDataGrpc.playersData) ||
                ((_a = finalDataGrpc === null || finalDataGrpc === void 0 ? void 0 : finalDataGrpc.playersData) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERRORCATCH_ERROR:', [
                    'final grpc data not found in afterRoundFinish',
                    tableId,
                ]);
                throw new Error('final grpc data not found in afterRoundFinish');
            }
            const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                'currentRound',
            ]);
            const tableGameplayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['seats']);
            if (!tableGameplayData) {
                throw new Error(`table not found in afterRoundFinis ${tableId}`);
            }
            const playersPgp = yield Promise.all(tableGameplayData.seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, tableConfigData.currentRound, ['userId', 'userStatus'])));
            const activePlayersPgp = (0, getPlayingUserInRound_1.getPlayingUserInRound)(playersPgp);
            /**
             * if not found any users then remove the table
             */
            if (activePlayersPgp.length === 0) {
                newLogger_1.Logger.info(`handleRoundFinish- ${tableId} -> activePlayersPgp not found`);
                return true;
            }
            const grpcPlayersData = finalDataGrpc.playersData;
            activePlayersPgp.map((pgpData) => {
                grpcPlayersData.map((gpd) => {
                    if (`${pgpData.userId}` === `${gpd.userId}`) {
                        pgpData.isPlayAgain = gpd.isPlayAgain;
                        pgpData.pointRummyAutoDebit = gpd.pointRummyAutoDebit;
                        pgpData.pointRummyWallet = gpd.pointRummyWallet;
                    }
                    return gpd;
                });
                return pgpData;
            });
            // this.removeOnLowBalanceAndAutoDebit(
            //   tableId,
            //   currentRound,
            //   tableConfigData,
            //   tableGameplayData,
            //   activePlayersPgp,
            // );
            const remainPlayers = activePlayersPgp.filter((player) => player.userStatus !== constants_1.PLAYER_STATE.LEFT);
            // scheduler.addJob.playMoreDelay(
            //   tableId,
            //   tableGameplayData,
            //   remainPlayers,
            //   finalDataGrpc,
            //   tableConfigData,
            // );
            return undefined;
        });
    }
    removeOnLowBalanceAndAutoDebit(tableId, currentRound, tableConfigData, tableGamePlayData, playersGameData) {
        return __awaiter(this, void 0, void 0, function* () {
            const LeaveTableHandler = (yield Promise.resolve().then(() => __importStar(require('../../services/leaveTable')))).default;
            let totalPlayer = 0;
            yield playersGameData.map((player) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const profile = yield userProfile_1.userProfileService.getUserDetailsById(player.userId);
                newLogger_1.Logger.info(`---removeOnLowBalanceAndAutoDebit--- tableId: ${tableId}, userId: ${player.userId} >> `, [
                    ' -- canPlayAgain -- ',
                    player.isPlayAgain,
                    ' -- playerInfo.pointRummyAutoDebit -- ',
                    player.pointRummyAutoDebit,
                ]);
                if (!player.isPlayAgain) {
                    yield LeaveTableHandler.main({
                        reason: constants_1.LEAVE_TABLE_REASONS.NO_BALANCE,
                        tableId,
                    }, player === null || player === void 0 ? void 0 : player.userId);
                }
                else {
                    const isAmountAutoDebited = (_a = player === null || player === void 0 ? void 0 : player.pointRummyAutoDebit) === null || _a === void 0 ? void 0 : _a.isAutoDebitDone;
                    if (isAmountAutoDebited) {
                        // local - true / main - true / autoDebitDone - true // update rummy wallet for user exp.
                        const autoDebitAmount = (_c = (_b = player === null || player === void 0 ? void 0 : player.pointRummyAutoDebit) === null || _b === void 0 ? void 0 : _b.moneyDetail) === null || _c === void 0 ? void 0 : _c.amount;
                        if (autoDebitAmount) {
                            (0, utils_1.sendAutoDebitInfo)({
                                socketId: profile === null || profile === void 0 ? void 0 : profile.socketId,
                                tableId,
                                userId: player === null || player === void 0 ? void 0 : player.userId,
                                amount: Number(autoDebitAmount),
                            });
                        }
                    }
                }
                totalPlayer += 1;
                if (playersGameData.length === totalPlayer) {
                    // leave disconnected users and initialize new game
                    yield (0, leaveDisconnectedUsers_1.leaveDisconnectedUsers)(tableId, currentRound);
                    // set round timer
                    yield index_2.scheduler.addJob.pointsNextRoundTimerStart(tableId, tableConfigData.currentRound);
                }
            }));
        });
    }
    setupNextRoundPoints(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(`setupNextRoundPoints: `, [tableId]);
            let lock;
            try {
                lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 5000);
                newLogger_1.Logger.info(`Lock acquired, in setupNextRoundPoints points on resource:, ${lock.resource}`);
                const tableInfo = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    '_id',
                    'gameType',
                    'currentRound',
                    'maximumSeat',
                    'shuffleEnabled',
                    'maximumPoints',
                    'bootValue',
                ]);
                const { currentRound } = tableInfo;
                const tableGamePlayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['seats', 'standupUsers']);
                if (!tableGamePlayData)
                    throw new Error(`tableGamePlay data not present setupNextRoundPoints ${tableId}`);
                const { tableGamePlayData: newTableGamePlayData, tableData: newTableConfigData, } = yield round_1.round.createNewRoundPoints(tableInfo, tableGamePlayData);
                newLogger_1.Logger.info(`setupNextRoundPoints creating new round >> : ${tableId} `, [newTableGamePlayData, newTableConfigData]);
                if (!newTableGamePlayData || !(newTableGamePlayData === null || newTableGamePlayData === void 0 ? void 0 : newTableGamePlayData.seats)) {
                    return newLogger_1.Logger.info(`seats not found on setupNextRoundPoints ${tableId}:${currentRound}`, `newTableGamePlayData: `, newTableGamePlayData);
                }
                // get seats without _id null
                const currentPlayersInTable = newTableGamePlayData.seats.filter((seat) => seat._id);
                const currentPlayersCount = currentPlayersInTable.length;
                if (currentPlayersCount >= newTableConfigData.minimumSeat) {
                    newLogger_1.Logger.info(`scheduled >>>> new Round: ${newTableConfigData.currentRound} 
          on table ${tableId}, currentPlayersCount: ${currentPlayersCount}`);
                    const roundTimerStartedData = {
                        tableId,
                        currentRound: newTableConfigData.currentRound || 1,
                        timer: date_1.dateUtils.addEpochTimeInSeconds(newTableConfigData.gameStartTimer),
                    };
                    yield index_2.scheduler.addJob.tableStart(tableId, (newTableConfigData.gameStartTimer - constants_1.NUMERICAL.FIVE) *
                        constants_1.NUMERICAL.THOUSAND);
                    // change state
                    yield Promise.all([
                        events_2.eventStateManager.fireEvent(tableId, events_1.STATE_EVENTS.START_ROUND_TIMER),
                        socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.ROUND_TIMER_STARTED, roundTimerStartedData),
                    ]);
                    newTableGamePlayData.tableState =
                        constants_1.TABLE_STATE.ROUND_TIMER_STARTED;
                    const currentTime = new Date();
                    newTableGamePlayData.tableCurrentTimer = new Date(currentTime.setSeconds(currentTime.getSeconds() +
                        Number(newTableConfigData.gameStartTimer))).toISOString();
                }
                newTableGamePlayData.noOfPlayers = currentPlayersCount;
                yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, newTableConfigData.currentRound, newTableGamePlayData);
                if (currentPlayersCount < newTableConfigData.maximumSeat) {
                    const key = `${(0, utils_1.getIdPrefix)(newTableConfigData.gameType)}:${newTableConfigData.lobbyId}`;
                    yield (0, redisWrapper_1.pushIntoQueue)(key, tableId);
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR _CATCH_ERROR_: setupNextRoundPoints, tableId( ${tableId}) found error:-`, [error]);
            }
            finally {
                try {
                    if (lock && lock instanceof redlock_1.Lock) {
                        yield redlock_2.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in setupNextRoundPoints; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on setupNextRoundPoints: ${err}`, err);
                }
            }
        });
    }
}
exports.winnerPoints = new WinnerPoints();
