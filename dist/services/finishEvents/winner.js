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
exports.winner = void 0;
const newLogger_1 = require("../../newLogger");
const connections_1 = require("../../connections");
const constants_1 = require("../../constants");
const events_1 = require("../../constants/events");
const playerGameplay_1 = require("../../db/playerGameplay");
const roundScoreBoard_1 = require("../../db/roundScoreBoard");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const date_1 = require("../../utils/date");
const cardHandler_1 = require("../gameplay/cardHandler");
const round_1 = require("../gameplay/round");
const seatShuffle_1 = require("../gameplay/seatShuffle");
const index_1 = require("../schedulerQueue/index");
const tableState_1 = require("../../constants/tableState");
const index_2 = require("../../db/turnHistory/index");
const events_2 = require("../../state/events");
const utils_1 = require("../../utils");
const turnHistory_1 = require("../../utils/turnHistory");
const mutant_1 = require("../mutant");
const index_3 = require("../split/index");
const winnerPoints_1 = require("./winnerPoints");
const userService_1 = __importDefault(require("../../userService"));
const redlock_1 = require("../../utils/lock/redlock");
const redlock_2 = require("redlock");
const kickEliminatedUsers_1 = require("../leaveTable/kickEliminatedUsers");
class Winner {
    constructor() {
        this.calcMinCardsPoints = (playersGameData) => {
            const playersCount = playersGameData.length;
            let minimumPoints = +Infinity;
            let minPointPlayerGameData = null;
            for (let i = 0; i < playersCount; ++i) {
                const { userStatus, points } = playersGameData[i];
                if (userStatus !== constants_1.PLAYER_STATE.LOST &&
                    userStatus !== constants_1.PLAYER_STATE.LEFT &&
                    userStatus !== constants_1.PLAYER_STATE.DROP &&
                    points < minimumPoints) {
                    minimumPoints = points;
                    minPointPlayerGameData = playersGameData[i];
                }
            }
            return { minimumPoints, minPointPlayerGameData };
        };
    }
    // _id,currentRound
    handleWinner(playerGameplayData, tableData, tableGameplayData) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info('handleWinner: ', [
                tableData._id,
                tableData,
                playerGameplayData,
            ]);
            const { _id: tableId, currentRound } = tableData;
            const { userId } = playerGameplayData;
            // setDropped player as declared player
            const tableGamePlayData = tableGameplayData;
            tableGamePlayData.declarePlayer = userId;
            yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGamePlayData);
            try {
                yield index_1.scheduler.cancelJob.botTurn(tableId, userId);
            }
            catch (error) {
                newLogger_1.Logger.error(`botTurn cancel for ${tableId} ${userId}`);
            }
            yield this.handleRoundWinner(tableId);
            newLogger_1.Logger.info(' ------- start next round ', [
                tableId,
                playerGameplayData,
                tableData,
                tableGameplayData,
            ]);
        });
    }
    clamp(num, min, max) {
        return num <= min ? min : num >= max ? max : num;
    }
    handleRoundWinner(tableId) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info('handleRoundWinner: ', [tableId]);
            const tableData = (yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                '_id',
                'currentRound',
                'rebuyUsed',
                'maximumPoints',
                'currencyType',
                'gameType',
                'dealsCount',
                'bootValue',
                'isNewGameTableUI',
                'lobbyId',
            ]));
            const { currentRound } = tableData;
            const tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                'tableState',
                'trumpCard',
                'seats',
                'rebuyableUsers',
                'opendDeck',
                'pointsForRoundWinner',
                'potValue',
                'closedDeck',
            ]);
            if (!tableData || !tableGameData) {
                throw new Error(`tableData or tableGameData not set in handleRoundWinner`);
            }
            if (tableGameData.tableState === constants_1.TABLE_STATE.PLAY_MORE ||
                tableGameData.tableState === constants_1.TABLE_STATE.WINNER_DECLARED) {
                newLogger_1.Logger.info('handleRoundWinner: table already finished ', [
                    tableId,
                    tableData,
                    tableGameData,
                ]);
                return;
            }
            const playersGameData = yield Promise.all(tableGameData.seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, [
                'userId',
                'dealPoint',
                'userStatus',
                'points',
                'rank',
                'winLoseStatus',
                'tenant',
                'groupingCards',
                'totalPoints',
                'username',
                'userObjectId',
                'meld',
            ])));
            const { potValue, seats } = tableGameData;
            const { minimumPoints, minPointPlayerGameData } = this.calcMinCardsPoints(playersGameData);
            const prevPlayersGameData = yield Promise.all(playersGameData.map((playerGame) => __awaiter(this, void 0, void 0, function* () {
                const lastRoundNum = currentRound - 1;
                if (lastRoundNum > 0 && playerGame) {
                    const prevPlayerGameData = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(playerGame.userId, tableId, lastRoundNum, ['userId', 'dealPoint']);
                    if (!prevPlayerGameData)
                        return {
                            dealPoint: tableData.maximumPoints,
                            useRebuy: false,
                            userId: playerGame.userId,
                        };
                    return prevPlayerGameData;
                }
                return {
                    dealPoint: 0,
                    useRebuy: false,
                    userId: playerGame === null || playerGame === void 0 ? void 0 : playerGame.userId,
                };
            })));
            if (tableData.gameType === constants_1.RUMMY_TYPES.DEALS) {
                newLogger_1.Logger.info('---minPointPlayerGameData.dealPoint--', [
                    minPointPlayerGameData.dealPoint,
                    tableGameData.pointsForRoundWinner,
                    ' --minPointPlayerGameData--',
                    minPointPlayerGameData.userId,
                    tableId,
                ]);
                minPointPlayerGameData.dealPoint +=
                    tableGameData.pointsForRoundWinner;
            }
            if (((_a = minPointPlayerGameData === null || minPointPlayerGameData === void 0 ? void 0 : minPointPlayerGameData.currentCards) === null || _a === void 0 ? void 0 : _a.length) > 13) {
                const remainingCard = minPointPlayerGameData.currentCards.pop();
                if (remainingCard) {
                    tableGameData.opendDeck.push(remainingCard);
                }
            }
            yield playerGameplay_1.playerGameplayService.setPlayerGameplay(minPointPlayerGameData.userId, tableId, tableData.currentRound, minPointPlayerGameData);
            const playingPlayers = playersGameData.filter((p) => {
                if (p) {
                    if (tableData.gameType === constants_1.RUMMY_TYPES.DEALS) {
                        return p.userStatus !== constants_1.PLAYER_STATE.LEFT;
                    }
                    else {
                        return (p.dealPoint < tableData.maximumPoints &&
                            p.userStatus !== constants_1.PLAYER_STATE.LEFT);
                    }
                }
            });
            const presentPlayers = playersGameData.filter((p) => p.userStatus !== constants_1.PLAYER_STATE.LEFT);
            // TODO: redundant assignment
            const players = presentPlayers;
            const scoreboardData = [];
            const seatCount = seats.length;
            //@ts-ignore
            playersGameData.sort(utils_1.rankSortComparator);
            for (let k = 0; k < seatCount; ++k) {
                const playerGamePlayData = playersGameData[k];
                if (!playerGamePlayData)
                    continue;
                playerGamePlayData.userStatus =
                    playerGamePlayData.userStatus.toLowerCase();
                const prevPlayerGamePlayData = prevPlayersGameData.find((prevPlayerGameData) => {
                    const prevUserId = prevPlayerGameData.userId;
                    return prevUserId === playerGamePlayData.userId;
                }) || {};
                if (tableData.gameType === constants_1.RUMMY_TYPES.DEALS) {
                    playerGamePlayData.winLoseStatus =
                        k === 0 ? constants_1.PLAYER_STATUS.WINNER : constants_1.PLAYER_STATUS.LOOSER;
                }
                else {
                    playerGamePlayData.winLoseStatus =
                        (playerGamePlayData.points === 0 ||
                            playerGamePlayData.points === minimumPoints) &&
                            playerGamePlayData.dealPoint < tableData.maximumPoints
                            ? constants_1.PLAYER_STATUS.WINNER
                            : constants_1.PLAYER_STATUS.LOOSER;
                }
                if (k === 0) {
                    playerGamePlayData.rank = k + 1;
                }
                else if (playersGameData &&
                    playersGameData[k - 1] &&
                    playerGamePlayData.dealPoint ===
                        ((_b = playersGameData[k - 1]) === null || _b === void 0 ? void 0 : _b.dealPoint)) {
                    playerGamePlayData.rank = ((_c = playersGameData[k - 1]) === null || _c === void 0 ? void 0 : _c.rank) || -1;
                }
                else {
                    //@ts-ignore-start
                    const r = parseInt(`${playersGameData[k - 1].rank}`, 10) + 1;
                    playerGamePlayData.rank = r;
                }
                if (tableData.gameType === constants_1.RUMMY_TYPES.DEALS) {
                    playerGamePlayData.rank =
                        playerGamePlayData.winLoseStatus === constants_1.PLAYER_STATUS.WINNER
                            ? 1
                            : 2;
                    scoreboardData.push(playerGamePlayData);
                }
                else {
                    if (prevPlayerGamePlayData.dealPoint <
                        tableData.maximumPoints ||
                        playerGamePlayData.useRebuy)
                        scoreboardData.push(playerGamePlayData);
                }
            }
            const isSplitable = yield index_3.splitHandler.isTableSplitable(playersGameData, tableData);
            let sendFinalInGrpc = true;
            if (tableData.gameType !== constants_1.RUMMY_TYPES.DEALS) {
                scoreboardData.forEach((scoreData) => {
                    const isRebuyPossible = this.isRejoinPossible(scoreData, playingPlayers, tableData);
                    if (isRebuyPossible) {
                        sendFinalInGrpc = false;
                        scoreData.canRebuyTable = isRebuyPossible; // playerwise
                        const isRebuyPossibleUsers = [
                            ...new Set(tableGameData.rebuyableUsers).add(scoreData.userId),
                        ].filter(Boolean);
                        tableGameData.rebuyableUsers = isRebuyPossibleUsers;
                    }
                });
            }
            const grpcRoundFinishInterface = {
                tableData,
                playersGameData,
                tableGameData,
                isFinalRound: true,
                minPointPlayerGameData,
                players,
            };
            let isFinalBattle = playingPlayers.length < 2 && sendFinalInGrpc;
            if (tableData.gameType === constants_1.RUMMY_TYPES.DEALS) {
                isFinalBattle = this.isFinalRound(playingPlayers, currentRound, tableData.dealsCount);
            }
            const tst = isFinalBattle
                ? 'WinnerDeclared'
                : 'roundWinnerDeclared';
            if (tst === 'WinnerDeclared') {
                tableGameData.tableState = constants_1.TABLE_STATE.WINNER_DECLARED;
                yield events_2.eventStateManager.fireEvent(tableId, events_1.STATE_EVENTS.GAME_WINNER);
            }
            else {
                tableGameData.tableState = constants_1.TABLE_STATE.ROUND_WINNER_DECLARED;
                yield events_2.eventStateManager.fireEvent(tableId, events_1.STATE_EVENTS.ROUND_WINNER);
            }
            tableGameplay_1.tableGameplayService.setTableGameplay(tableId, tableData.currentRound, tableGameData);
            const playersInfoData = yield Promise.all(scoreboardData.map((e) => userProfile_1.userProfileService.getUserDetailsById(e.userObjectId)));
            grpcRoundFinishInterface.playersInfoData = playersInfoData;
            const grpcResponse = yield this.grpcCallForRoundFinish(tableData, tableGameData, playersGameData, minPointPlayerGameData, isFinalBattle, players, playersInfoData);
            yield this.updateRoundEndHistory(scoreboardData, currentRound, grpcResponse, tableId, tableGameData.trumpCard, tableGameData.closedDeck, tableGameData.opendDeck[tableGameData.opendDeck.length - 1]);
            const playersProfileData = yield Promise.all(playersGameData.map((e) => userProfile_1.userProfileService.getUserDetailsById(e === null || e === void 0 ? void 0 : e.userId)));
            const winnerDeclarePlayerInfo = [];
            const scoreBoardPlayerInfo = [];
            let winningCash = 0;
            let winnerUserId = 0;
            for (let i = 0; i < scoreboardData.length; i++) {
                const playerData = scoreboardData[i];
                if (playerData) {
                    const profileData = playersProfileData.find((e) => e.id === (playerData === null || playerData === void 0 ? void 0 : playerData.userId));
                    const meldLabel = cardHandler_1.cardHandler.labelTheMeld({
                        meld: playerData === null || playerData === void 0 ? void 0 : playerData.meld,
                        cardsGroup: playerData === null || playerData === void 0 ? void 0 : playerData.groupingCards,
                    });
                    const grpcPlayerData = grpcResponse === null || grpcResponse === void 0 ? void 0 : grpcResponse.playersData.find((p) => p.userId === (playerData === null || playerData === void 0 ? void 0 : playerData.userId));
                    // for new gameTableUI
                    // when 2P available at last then change the staus playing to finish to show cards
                    const userStatus = (playerData === null || playerData === void 0 ? void 0 : playerData.userStatus) === constants_1.PLAYER_STATE.PLAYING
                        ? constants_1.PLAYER_STATE.FINISH
                        : playerData === null || playerData === void 0 ? void 0 : playerData.userStatus;
                    let status = playerData === null || playerData === void 0 ? void 0 : playerData.winLoseStatus;
                    if (status === constants_1.PLAYER_STATUS.WINNER) {
                        winningCash = grpcPlayerData.cashWinnings.amount || 0;
                        winnerUserId = playerData.userId;
                    }
                    // const totalPoints = playerData?.dealPoint;
                    newLogger_1.Logger.info('---playerData.dealPoint,--=--', [
                        playerData.dealPoint,
                        `
        grpcPlayerData for userid ${playerData === null || playerData === void 0 ? void 0 : playerData.userId} and tableid ${tableId}
        ${JSON.stringify(grpcPlayerData)}
        `,
                    ]);
                    status =
                        userStatus === constants_1.PLAYER_STATE.DROP ? userStatus : status;
                    winnerDeclarePlayerInfo.push({
                        userId: playerData === null || playerData === void 0 ? void 0 : playerData.userId,
                        status: status,
                        winLoseStatus: playerData.winLoseStatus,
                        totalPoints: playerData.dealPoint,
                    });
                    scoreBoardPlayerInfo.push({
                        userId: playerData === null || playerData === void 0 ? void 0 : playerData.userId,
                        username: (profileData === null || profileData === void 0 ? void 0 : profileData.userName) || '',
                        profilePicture: (profileData === null || profileData === void 0 ? void 0 : profileData.avatarUrl) || '',
                        status,
                        userStatus,
                        totalPoints: playerData.dealPoint,
                        points: playerData === null || playerData === void 0 ? void 0 : playerData.points,
                        meld: meldLabel,
                        group: playerData === null || playerData === void 0 ? void 0 : playerData.groupingCards,
                        isRebuyApplicable: 
                        // tableData.gameType === RUMMY_TYPES.DEALS
                        //   ? false
                        //   : grpcPlayerData?.isPlayAgain,
                        false,
                        canPlayAgain: grpcPlayerData === null || grpcPlayerData === void 0 ? void 0 : grpcPlayerData.isPlayAgain,
                        rank: (grpcPlayerData === null || grpcPlayerData === void 0 ? void 0 : grpcPlayerData.rank) || 0,
                        winAmount: (0, utils_1.getWinnings)(tableData.bootValue, (grpcPlayerData === null || grpcPlayerData === void 0 ? void 0 : grpcPlayerData.rank) || 0, scoreboardData.length, tableData.currencyType, ((_d = grpcPlayerData === null || grpcPlayerData === void 0 ? void 0 : grpcPlayerData.cashWinnings) === null || _d === void 0 ? void 0 : _d.amount) || 0),
                        tenant: playerData.tenant,
                    });
                }
            }
            let splitAmountPerPlayer = 0;
            let splitUsers = [];
            if ((_e = isSplitable === null || isSplitable === void 0 ? void 0 : isSplitable.playingPlayers) === null || _e === void 0 ? void 0 : _e.length) {
                splitAmountPerPlayer =
                    potValue / isSplitable.playingPlayers.length;
                splitUsers = isSplitable.playingPlayers.map((su) => su.userId);
            }
            const scoreBoardData = {
                tableId,
                potValue,
                tableState: tableGameData.tableState,
                split: Boolean(isSplitable && isSplitable.splitType),
                wildCard: tableGameData.trumpCard,
                winnerUserId: tableData.gameType === constants_1.RUMMY_TYPES.DEALS
                    ? winnerUserId
                    : minPointPlayerGameData.userId,
                playerInfo: scoreBoardPlayerInfo,
                rebuyable: !sendFinalInGrpc,
                splitAmountPerPlayer,
                splitUsers,
                tie: (0, utils_1.isGameTie)(playingPlayers) && playingPlayers.length > 1,
            };
            yield roundScoreBoard_1.roundScoreBoardService.setRoundScoreBoard(tableId, currentRound, scoreBoardData);
            yield round_1.round.saveRoundScoreCardData(tableId, scoreBoardData);
            const winnerDeclareData = {
                tableId,
                potValue,
                tableState: tst,
                playerInfo: winnerDeclarePlayerInfo,
                currencyType: tableData.currencyType,
                winnerUserId,
                winningCash,
            };
            yield socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.WINNER_DECLARE, winnerDeclareData);
            yield index_1.scheduler.addJob.scoreBoard(tableId, currentRound, playingPlayers, grpcResponse, tableData === null || tableData === void 0 ? void 0 : tableData.isNewGameTableUI);
        });
    }
    updateRoundEndHistory(scoreboardData, currentRound, grpcResponse, tableId, trumpCard, closedDeck, openTopCard) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let currentRoundHistory = yield index_2.turnHistoryService.getTurnHistory(tableId, currentRound);
                const userFinalStateTurnDetails = [];
                let length = userFinalStateTurnDetails.length + 1;
                scoreboardData.forEach((user) => {
                    const cardState = (0, utils_1.removeEmptyString)(user.groupingCards.toString());
                    const historyObj = {
                        turnNo: length,
                        userId: user.userObjectId || user.userId,
                        turnStatus: String(user.userStatus).toUpperCase(),
                        startState: cardState,
                        cardPicked: '',
                        cardPickSource: '',
                        cardDiscarded: '',
                        endState: cardState,
                        createdOn: new Date().toISOString(),
                        points: user.points,
                        totalPoints: user.dealPoint || user.points,
                        sortedStartState: (0, turnHistory_1.sortedCards)(user.groupingCards, user.meld || []),
                        sortedEndState: (0, turnHistory_1.sortedCards)(user.groupingCards, user.meld || []),
                        isBot: user.isBot,
                        wildCard: trumpCard,
                        closedDeck: closedDeck,
                        openedDeckTop: openTopCard,
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
                        index_2.turnHistoryService.getDefaultCurrentRoundTurnHistoryData(tableConfigData, tableGameData);
                    yield index_2.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory);
                }
                currentRoundHistory.userFinalStateTurnDetails =
                    userFinalStateTurnDetails;
                yield index_2.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory);
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR updateRoundEndHistory', [tableId, error]);
            }
        });
    }
    isRejoinPossible(currPlayer, playingPlayers, tableData) {
        if (tableData.currencyType === tableState_1.CURRENCY_TYPE.COINS)
            return false;
        const { maximumPoints } = tableData;
        const { TABLE_MAX_REJOINABLE_POINTS_101, TABLE_MAX_REJOINABLE_POINTS_201, TABLE_MAX_REJOINABLE_POINTS_61, } = connections_1.zk.getConfig();
        if (currPlayer.dealPoint < maximumPoints ||
            currPlayer.userStatus === constants_1.PLAYER_STATE.LEFT)
            return false;
        let rejoinMaxPoints = TABLE_MAX_REJOINABLE_POINTS_101;
        if (maximumPoints === constants_1.POOL_TYPES.TWO_ZERO_ONE)
            rejoinMaxPoints = TABLE_MAX_REJOINABLE_POINTS_201;
        else if (maximumPoints === constants_1.POOL_TYPES.SIXTY_ONE)
            rejoinMaxPoints = TABLE_MAX_REJOINABLE_POINTS_61;
        const filteredPlayers = playingPlayers.filter((p) => p.dealPoint > rejoinMaxPoints);
        if (filteredPlayers.length === 0 && playingPlayers.length >= 2)
            return true;
        return false;
    }
    isFinalRound(playingPlayers, currentRound, dealsCount) {
        const roundCount = dealsCount;
        playingPlayers.filter((n) => n);
        if (playingPlayers.length === constants_1.NUMERICAL.ONE)
            return true;
        if (roundCount === currentRound && !(0, utils_1.isGameTie)(playingPlayers)) {
            return true;
        }
        if (currentRound > roundCount)
            return true;
        return false;
    }
    grpcCallForRoundFinish(tableData, tableGameData, playersGameData, minPointPlayerGameData, isFinalRound, histData, playersInfoData) {
        return __awaiter(this, void 0, void 0, function* () {
            // const config = getConfig();
            let grpcRes;
            try {
                newLogger_1.Logger.info('grpcCallForRoundFinish : ', [
                    tableData,
                    tableGameData,
                    playersGameData,
                    minPointPlayerGameData,
                    isFinalRound,
                    histData,
                    playersInfoData,
                ]);
                const { _id: tableId, currentRound, gameType } = tableData;
                let winnerId = minPointPlayerGameData.userId;
                const roundHistory = yield index_2.turnHistoryService.getTurnHistory(tableId, currentRound);
                // const roundHistory = playerHistory.history.pop();
                /**
                 * Update winnerId from here
                 */
                roundHistory.winnerId = winnerId;
                roundHistory.turnsDetails.forEach((turn) => {
                    if (Array.isArray(turn.startState))
                        turn.startState = (0, utils_1.removeEmptyString)(turn.startState.join(','));
                    if (Array.isArray(turn.endState))
                        turn.endState = (0, utils_1.removeEmptyString)(turn.endState.join(','));
                });
                yield index_2.turnHistoryService.setTurnHistory(tableId, currentRound, roundHistory);
                const gameEndReasonMap = {};
                const lobbyDetails = {};
                playersGameData.forEach((player) => {
                    if (!player) {
                        throw new Error(`PlayerGamePlay not found, ${tableId}`);
                    }
                    gameEndReasonMap[player.userId] =
                        player.userId === winnerId
                            ? constants_1.GAME_END_REASONS.WON
                            : player.userStatus;
                    lobbyDetails[String(player.userId)] = tableData.lobbyId;
                });
                const battleId = (0, utils_1.isPointsRummyFormat)(gameType)
                    ? `${(0, utils_1.getIdPrefix)(gameType)}-${tableId}-${currentRound}`
                    : `${(0, utils_1.getIdPrefix)(gameType)}-${tableId}`;
                if (isFinalRound) {
                    const formatedHistory = {
                        _id: battleId,
                        cd: new Date().toDateString(),
                        tbid: tableId,
                        rummyType: tableData.gameType,
                        lobbyId: tableData.lobbyId,
                        startingUsersCount: tableGameData.seats.length,
                        gameDetails: [],
                    };
                    const turnHistoryPromises = Array.from({ length: currentRound }, (_, i) => i + 1 === currentRound
                        ? Promise.resolve(roundHistory)
                        : index_2.turnHistoryService.getTurnHistory(tableId, i + 1));
                    const allTurnHistories = yield Promise.all(turnHistoryPromises);
                    formatedHistory.gameDetails = allTurnHistories.map((history) => ({
                        roundNo: history.roundNo,
                        winnerId: history.winnerId,
                        turnsDetails: history.turnsDetails.map(({ turnNo, userId, turnStatus, startState, cardPicked, cardPickSource, cardDiscarded, endState, createdOn, points, sortedStartState, sortedEndState, isBot, wildCard, closedDeck, openedDeckTop, }) => ({
                            turnNo,
                            userId,
                            turnStatus,
                            startState,
                            cardPicked,
                            cardPickSource,
                            cardDiscarded,
                            endState,
                            createdOn,
                            points,
                            sortedStartState,
                            sortedEndState,
                            isBot,
                            wildCard,
                            closedDeck,
                            openedDeckTop,
                        })),
                    }));
                    newLogger_1.Logger.info(`formatedHistory ${tableId} `, [formatedHistory]);
                    yield index_2.turnHistoryService.setGameTurnHistory(tableId, formatedHistory);
                }
                const userInfo = [];
                let highestDp = 0;
                for (let i = 0; i < playersGameData.length; i++) {
                    const element = playersGameData[i];
                    if (element) {
                        if (tableData.gameType === constants_1.RUMMY_TYPES.DEALS &&
                            highestDp < element.dealPoint &&
                            isFinalRound) {
                            highestDp = element.dealPoint;
                            winnerId = element.userId;
                        }
                        userInfo.push({
                            id: element.userId,
                            points: (0, utils_1.isPointsRummyFormat)(tableData.gameType)
                                ? element.points
                                : element.dealPoint,
                        });
                    }
                }
                const finishBattleRes = yield userService_1.default.finishBattle(battleId.split('-')[1], currentRound.toString(), `${tableId}.json`, [winnerId], userInfo, isFinalRound);
                const finishBattleResponse = finishBattleRes.data.playersData
                    .sort((a, b) => {
                    return parseInt(b.amount, 10) - parseInt(a.amount, 10);
                })
                    .map((ele, i) => {
                    const matchObj = playersGameData.find((us) => (us === null || us === void 0 ? void 0 : us.userId) === ele.id);
                    if (matchObj) {
                        matchObj['cashWinnings'] = { amount: ele.amount };
                        matchObj['isPlayAgain'] = ele.canPlayAgain;
                        matchObj['rank'] = i + 1;
                        return matchObj;
                    }
                    return null;
                })
                    .filter((e) => e);
                if (finishBattleRes.status) {
                    grpcRes = {
                        success: true,
                        playersData: finishBattleResponse,
                    };
                }
                else {
                    throw new Error(finishBattleRes);
                }
                return grpcRes;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR grpcCallForRoundFinish table: ${tableData._id}`, [
                    error,
                ]);
            }
        });
    }
    showScoreboard(tableId, currentRound, grpcResponse, isPointsRummy) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(`showScoreboard for table: ${tableId}`);
            const winnerData = yield roundScoreBoard_1.roundScoreBoardService.getRoundScoreBoard(tableId, currentRound);
            winnerData.playerInfo =
                yield mutant_1.mutantService.addTenantToPlayerInfo(winnerData.playerInfo);
            if (winnerData) {
                winnerData.playerInfo.sort((a, b) => {
                    return a.totalPoints - b.totalPoints;
                });
                const futureTime = new Date(new Date().getTime() + 15 * 1000).getTime();
                winnerData.nextRoundTimer = futureTime.toString();
                yield socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.ROUND_FINISH_SCOREBOARD, winnerData);
                isPointsRummy
                    ? yield winnerPoints_1.winnerPoints.handleRoundFinishPoints(tableId, currentRound, grpcResponse)
                    : yield this.handleRoundFinish(tableId, winnerData, currentRound, grpcResponse);
            }
        });
    }
    handleRoundFinish(tableId, winnerData, currentRound, finalDataGrpc) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Object.keys(finalDataGrpc).length === 0 ||
                !finalDataGrpc.playersData ||
                finalDataGrpc.playersData.length === 0) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR CATCH_ERROR: final grpc data not found in afterRoundFinish ', [tableId]);
                throw new Error(`INTERNAL_SERVER_ERROR final grpc data not found in afterRoundFinish,${tableId}`);
            }
            const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                '_id',
                'currentRound',
                'gameType',
                'maximumPoints',
                'shuffleEnabled',
                'gameType',
                'bootValue',
            ]);
            const tableInfo = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['tableState', 'seats']);
            if (!tableInfo) {
                throw new Error(`table not found in afterRoundFinis ${tableId}`);
            }
            const promiseList = tableInfo.seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, tableConfigData.currentRound, ['dealPoint', 'userStatus', 'userId']));
            const players = yield Promise.all(promiseList);
            const playersInfoPromise = tableInfo.seats.map((seat) => userProfile_1.userProfileService.getUserDetailsById(seat._id));
            const playersInfo = yield Promise.all(playersInfoPromise);
            const eliminatedPlayers = [];
            let activePlayers = players;
            if (tableConfigData.gameType === constants_1.RUMMY_TYPES.POOL) {
                activePlayers = players.filter((player) => {
                    if (player) {
                        if (tableConfigData.maximumPoints === constants_1.POOL_TYPES.TWO_ZERO_ONE) {
                            if (player.dealPoint >= constants_1.POOL_TYPES.TWO_ZERO_ONE)
                                eliminatedPlayers.push(player);
                            else
                                return true;
                        }
                        else if (tableConfigData.maximumPoints === constants_1.POOL_TYPES.SIXTY_ONE) {
                            if (player.dealPoint >= constants_1.POOL_TYPES.SIXTY_ONE)
                                eliminatedPlayers.push(player);
                            else
                                return true;
                        }
                        else if (player.dealPoint >= constants_1.POOL_TYPES.ONE_ZERO_ONE) {
                            eliminatedPlayers.push(player);
                        }
                        else
                            return true;
                        return false;
                    }
                });
            }
            /**
             * if not found any users then remove the table
             */
            if (activePlayers.length === 0) {
                newLogger_1.Logger.info(`afterRoundFinish- ${tableId} -> table deleted`);
                /**
                 * TODO: remove the table
                 * all redis and mongodb data
                 */
                // removeTable(tableId);
                return true;
            }
            tableGameplay_1.tableGameplayService.setTableGameplay(tableId, tableConfigData.currentRound, tableInfo);
            // if (
            //   activePlayers.length > 0 &&
            //   tableInfo.tableState === TABLE_STATE.WINNER_DECLARED
            // ) {
            //   // set playMoreDelayTimer
            //   // const remainPlayers = players.filter(
            //   //   (player: any) => player.userStatus !== PLAYER_STATE.LEFT,
            //   // );
            //   // scheduler.addJob.playMoreDelay(
            //   //   tableId,
            //   //   tableInfo,
            //   //   remainPlayers,
            //   //   finalDataGrpc,
            //   //   tableConfigData,
            //   // );
            // }
            //// to do
            if (tableConfigData.gameType === constants_1.RUMMY_TYPES.DEALS &&
                tableInfo.tableState === constants_1.TABLE_STATE.ROUND_WINNER_DECLARED) {
                const lock = yield redlock_1.redlock.Lock.acquire([`lock:${tableId}`], 2000);
                newLogger_1.Logger.info(`Lock acquired, in setupNextRound resource:, ${lock === null || lock === void 0 ? void 0 : lock.resource}`);
                yield this.setupNextRound(tableConfigData, eliminatedPlayers, playersInfo, finalDataGrpc, false, activePlayers, winnerData);
                try {
                    if (lock && lock instanceof redlock_2.Lock) {
                        yield redlock_1.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in leaveTable; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on leaveTable: ${err}`);
                }
            }
            else if (tableConfigData.gameType === constants_1.RUMMY_TYPES.POOL) {
                yield this.setupNextRound(tableConfigData, eliminatedPlayers, playersInfo, finalDataGrpc, false, activePlayers, winnerData);
            }
            return undefined;
        });
    }
    setupNextRound(tableInfo, eliminatedPlayers, usersInfo, finalDataGrpc, winnerIsColluder = false, activePlayers, winData) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(`setupNextRound`, [
                tableInfo,
                eliminatedPlayers,
                winnerIsColluder,
            ]);
            const { currentRound, _id: tableId } = tableInfo;
            const tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                'isRebuyable',
                'seats',
                'tableState',
                'tableCurrentTimer',
                'potValue',
                'totalPlayerPoints',
                'noOfPlayers',
                'rebuyableUsers',
                'standupUsers',
            ]);
            if (!tableGameData)
                throw new Error(`table game data not present setupNextRound ${tableId}`);
            if (activePlayers.length > 1 || (winData === null || winData === void 0 ? void 0 : winData.rebuyable)) {
                const isTableRejoinable = winData.playerInfo.find((player) => player.isRebuyApplicable);
                const isTableSplitable = winData.split;
                newLogger_1.Logger.info(`setupNextRound >> if >> ${tableId}`, [
                    isTableRejoinable,
                    isTableSplitable,
                ]);
                if (!isTableRejoinable) {
                    const LeaveTableHandler = (yield Promise.resolve().then(() => __importStar(require('../../services/leaveTable')))).default;
                    eliminatedPlayers.forEach((user) => __awaiter(this, void 0, void 0, function* () {
                        if (user.userStatus !== constants_1.PLAYER_STATE.LEFT) {
                            // send eliminated users leave table
                            LeaveTableHandler.main({
                                tableId,
                                reason: constants_1.LEAVE_TABLE_REASONS.ELIMINATED,
                            }, user.userId);
                        }
                    }));
                    // check this
                    yield new Promise((resolve) => {
                        setTimeout(resolve, 500);
                    });
                }
                const nextRoundTimer = isTableRejoinable || isTableSplitable
                    ? constants_1.NUMERICAL.FIFTEEN
                    : constants_1.NUMERICAL.FIVE;
                // tableGameData.isSplitable = isTableSplitable;
                tableGameData.isRebuyable = isTableRejoinable;
                const { tableGamePlayData } = yield round_1.round.createNewRound(tableInfo, tableGameData, nextRoundTimer, usersInfo);
                // set round timer
                yield index_1.scheduler.addJob.roundTimerStart(tableId, tableInfo.currentRound, nextRoundTimer, eliminatedPlayers, isTableRejoinable);
                // seat shuffle
                if (tableInfo.shuffleEnabled) {
                    newLogger_1.Logger.info(`seat shuffling --- table: ${tableId}`, [
                        isTableRejoinable,
                        eliminatedPlayers,
                    ]);
                    (0, seatShuffle_1.seatShuffle)(tableId, currentRound, tableGamePlayData, eliminatedPlayers, isTableRejoinable, winData);
                }
                newLogger_1.Logger.info(`-setup round for ${currentRound + 1} round for table ${tableId}`);
            }
            else {
                // await Lib.Round.dumpRounData(tableInfo._id, tableInfo.currentRound);
            }
        });
    }
    handleRoundTimerExpired(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { nextRoundTimer, tableId, currentRound, eliminatedPlayers, isTableRejoinable, } = data;
            newLogger_1.Logger.info(`handleRoundTimerExpired: RTS  ${tableId}:${currentRound}`);
            const roundTimerStartedData = {
                tableId,
                currentRound,
                timer: date_1.dateUtils.addEpochTimeInSeconds(nextRoundTimer),
            };
            yield socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.ROUND_TIMER_STARTED, roundTimerStartedData);
            yield index_1.scheduler.addJob.roundStart(tableId, nextRoundTimer * constants_1.NUMERICAL.THOUSAND);
            const playingEliminatedPlayers = eliminatedPlayers.filter((player) => player.userStatus !== constants_1.PLAYER_STATE.LEFT);
            if (isTableRejoinable) {
                index_1.scheduler.addJob.kickEliminatedUsers((nextRoundTimer - 5) * constants_1.NUMERICAL.THOUSAND, tableId, playingEliminatedPlayers);
            }
            else {
                yield (0, kickEliminatedUsers_1.kickEliminatedUsers)(tableId, playingEliminatedPlayers);
            }
        });
    }
}
exports.winner = new Winner();
