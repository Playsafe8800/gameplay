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
exports.finishGame = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const underscore_1 = __importDefault(require("underscore"));
const constants_1 = require("../../constants");
const events_1 = require("../../constants/events");
const turnHistory_1 = require("../../constants/turnHistory");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const index_1 = require("../../db/turnHistory/index");
const userProfile_1 = require("../../db/userProfile");
const objectModels_1 = require("../../objectModels");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const events_2 = require("../../state/events");
const utils_1 = require("../../utils");
const cards_1 = require("../../utils/cards");
const date_1 = require("../../utils/date");
const index_2 = require("../../utils/errors/index");
const redlock_2 = require("../../utils/lock/redlock");
const cancelBattle_1 = require("../gameplay/cancelBattle");
const cardHandler_1 = require("../gameplay/cardHandler");
const turn_1 = require("../gameplay/turn");
const schedulerQueue_1 = require("../schedulerQueue");
const finishGame_1 = require("./deals/finishGame");
const declareCard_1 = require("./declareCard");
const dropGame_1 = require("./dropGame");
const winner_1 = require("./winner");
const winnerPoints_1 = require("./winnerPoints");
const gameEndReasons_1 = require("../../constants/gameEndReasons");
class FinishGame {
    finishGame(meld, tableId, userId, group, networkParams) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`Finish game called tableId: ${tableId}, userId: ${userId}`);
                const tableConfigData = (yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    '_id',
                    'userFinishTimer',
                    'currentRound',
                    'gameType',
                    'maximumPoints',
                ]));
                const { currentRound } = tableConfigData;
                const tableGameplayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                    'seats',
                    'closedDeck',
                    'finishPlayer',
                    'declarePlayer',
                    'opendDeck',
                    'trumpCard',
                ]);
                if (!tableGameplayData) {
                    throw Error(`TGP not found for table ${tableId} for finishGame`);
                }
                const { seats, trumpCard, declarePlayer } = tableGameplayData;
                const pgps = yield Promise.all(seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, [
                    'userId',
                    'userStatus',
                    'isFirstTurn',
                    'dealPoint',
                    'points',
                    'meld',
                    'groupingCards',
                    'dealPoint',
                    'tenant',
                    'seatIndex',
                ])));
                const playersGameData = [];
                pgps.forEach((pgp) => {
                    if (pgp)
                        playersGameData.push(pgp);
                });
                const declarePlayerGameData = playersGameData.find((ele) => ele.userId === declarePlayer) ||
                    {};
                const finishPlayerGameData = playersGameData.find((ele) => ele.userId === userId) ||
                    {};
                if (finishPlayerGameData.userStatus === constants_1.PLAYER_STATE.DECLARED ||
                    finishPlayerGameData.userStatus === constants_1.PLAYER_STATE.PLAYING) {
                    // Calculate card points
                    const { score: points } = cardHandler_1.cardHandler.groupCardsOnMeld(group, trumpCard, tableConfigData.maximumPoints);
                    const isValidSequence = cards_1.cardUtils.areSequencesValid(meld);
                    /**
                     * if user has declared in his first turn
                     * then devide points by 2
                     */
                    const cardPoints = finishPlayerGameData.isFirstTurn
                        ? (0, utils_1.roundInt)(points / 2, 0)
                        : points;
                    // let isPointAdded = false;
                    // if (userId !== declarePlayer) {
                    //   isPointAdded = true;
                    // }
                    if (userId !== declarePlayer) {
                        finishPlayerGameData.dealPoint += cardPoints;
                    }
                    finishPlayerGameData.userStatus = constants_1.PLAYER_STATE.FINISH;
                    finishPlayerGameData.points = cardPoints;
                    newLogger_1.Logger.info('-finishPlayerGameData.dealPoint--', [
                        finishPlayerGameData.dealPoint,
                        finishPlayerGameData.points,
                        '--finishPlayerGameData.points---',
                        finishPlayerGameData.userId,
                        cardPoints,
                        userId !== declarePlayer,
                        tableId,
                    ]);
                    tableGameplayData.finishPlayer.push(finishPlayerGameData.userId);
                    const sequenceCount = cards_1.cardUtils.sequenceCount(meld);
                    if (cardPoints === 0 &&
                        declarePlayer !== finishPlayerGameData.userId &&
                        sequenceCount[objectModels_1.MELD.PURE] + sequenceCount[objectModels_1.MELD.SEQUENCE] > 1) {
                        finishPlayerGameData.points = constants_1.NUMERICAL.TWO;
                    }
                    const finishRoundEventData = {
                        tableId,
                        userId,
                        totalPoints: finishPlayerGameData.dealPoint,
                    };
                    yield Promise.all([
                        socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.FINISH_ROUND, finishRoundEventData),
                        events_2.eventStateManager.fireEventUser(tableId, userId, events_1.USER_EVENTS.FINISH, (networkParams === null || networkParams === void 0 ? void 0 : networkParams.timeStamp) ||
                            date_1.dateUtils.getCurrentEpochTime()),
                    ]);
                    // cancelling finish timer
                    if (finishPlayerGameData.userId === declarePlayer) {
                        yield schedulerQueue_1.scheduler.cancelJob.finishTimer(tableId, currentRound);
                    }
                    if (userId !== declarePlayer) {
                        if (isValidSequence && cardPoints === 0) {
                            /**
                             * If user is not the declarePlayer but
                             * If card points is 0 &&
                             * contains valid seq AKA valid declare
                             */
                            finishPlayerGameData.points =
                                constants_1.POINTS.LATE_DECLARE_PENALTY_POINTS;
                            finishPlayerGameData.dealPoint +=
                                finishPlayerGameData.points;
                        }
                    }
                    newLogger_1.Logger.info(`finishGame: update tgp, pgp for table: ${tableId}`, [tableGameplayData, playersGameData]);
                    yield Promise.all([
                        tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameplayData),
                        playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, finishPlayerGameData),
                    ]);
                    let isInvalidDeclare = false;
                    if (userId === declarePlayer &&
                        isValidSequence &&
                        cardPoints === constants_1.NUMERICAL.ZERO) {
                        const currentRoundHistory = yield index_1.turnHistoryService.getTurnHistory(tableId, currentRound);
                        currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].turnStatus = turnHistory_1.TURN_HISTORY.VALID_DECLARE;
                        currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].points = 0;
                        /**
                         * If user is the declarePlayer &&
                         * card points is 0 &&
                         * contains valid seq AKA valid declare
                         */
                        yield Promise.all([
                            declareCard_1.declareCardEvent.scheduleFinishTimer(tableConfigData, tableGameplayData, playersGameData, true),
                            index_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory),
                            events_2.eventStateManager.fireEvent(tableId, events_1.STATE_EVENTS.VALID_FINISH),
                        ]);
                    }
                    else if (userId === declarePlayer) {
                        // if invalid declare
                        /**
                         * as use lock in parent func hence
                         * don't use await here to avoid lock conflicts
                         */
                        isInvalidDeclare = true;
                        finishPlayerGameData.gameEndReason =
                            gameEndReasons_1.GAME_END_REASONS_INSTRUMENTATION.INVALID_DECLARE;
                        yield playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, finishPlayerGameData);
                        const invalidFinishData = {
                            tableId,
                            userId,
                            openCard: tableGameplayData.opendDeck.slice(-1)[0],
                            score: finishPlayerGameData.points,
                            meld,
                        };
                        if (finishPlayerGameData.userId === declarePlayer) {
                            yield Promise.all([
                                events_2.eventStateManager.fireEvent(tableId, events_1.STATE_EVENTS.INVALID_FINISH),
                                socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.INVALID_DECLARE_FINISH, invalidFinishData),
                            ]);
                        }
                        yield (0, dropGame_1.dropGame)({ tableId }, { userId }, constants_1.GAME_END_REASONS.INVALID_DECLARE);
                    }
                    /**
                     * send room event with player data to show declaring scoreboard
                     */
                    if (!isInvalidDeclare) {
                        yield this.showRoundDeclaredScoreBoard(tableId, seats, playersGameData, tableGameplayData.trumpCard);
                    }
                    //-------
                    const activePlayers = playersGameData.filter((ele) => ele.userStatus === constants_1.PLAYER_STATE.PLAYING);
                    if (!activePlayers.length) {
                        newLogger_1.Logger.info(' everyone has finished -----', [
                            tableId,
                            playersGameData,
                        ]);
                        // if all players finished or any declare player do invalid decalre(ps > 0)
                        // const jobIds = `${PLAYER_STATE.FINISH}-${tableId}-${currentRound}-true`;
                        yield schedulerQueue_1.scheduler.cancelJob.finishTimer(tableId, currentRound, true);
                        // finishPlayerGameData.dealPoint +=
                        //   finishPlayerGameData.cardPoints;
                        newLogger_1.Logger.info(' helperAllPlayersFinished is called -----', [
                            tableId,
                            playersGameData,
                        ]);
                        yield this.helperAllPlayersFinished(tableConfigData, tableGameplayData, playersGameData, declarePlayerGameData, finishPlayerGameData, userId, currentRound);
                    }
                }
            }
            catch (error) {
                if (error instanceof index_2.CancelBattleError) {
                    yield cancelBattle_1.cancelBattle.cancelBattle(tableId, error);
                }
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR error occurred at finishGame `, [error]);
            }
        });
    }
    /**
     * send room event with player data to show declaring scoreboard
     */
    showRoundDeclaredScoreBoard(tableId, seats, playersGameData, wildCard = '') {
        return __awaiter(this, void 0, void 0, function* () {
            const seatCount = seats.length;
            const declareFinishScoreBoardData = [];
            for (let k = 0; k < seatCount; ++k) {
                const playerGamePlayData = playersGameData[k];
                if (!playerGamePlayData)
                    continue;
                playerGamePlayData.userStatus =
                    playerGamePlayData.userStatus.toLowerCase();
                declareFinishScoreBoardData.push(playerGamePlayData);
            }
            const playersProfileData = yield Promise.all(playersGameData.map((e) => userProfile_1.userProfileService.getUserDetailsById(e === null || e === void 0 ? void 0 : e.userId)));
            const scoreBoardPlayerInfo = [];
            declareFinishScoreBoardData.map((playerData) => {
                if (playerData) {
                    const profileData = playersProfileData.find((e) => e.id === (playerData === null || playerData === void 0 ? void 0 : playerData.userId));
                    const meldLabel = cardHandler_1.cardHandler.labelTheMeld({
                        meld: playerData === null || playerData === void 0 ? void 0 : playerData.meld,
                        cardsGroup: playerData === null || playerData === void 0 ? void 0 : playerData.groupingCards,
                    });
                    scoreBoardPlayerInfo.push({
                        userId: playerData === null || playerData === void 0 ? void 0 : playerData.userId,
                        username: (profileData === null || profileData === void 0 ? void 0 : profileData.userName) || '',
                        userStatus: (playerData === null || playerData === void 0 ? void 0 : playerData.userStatus) || '',
                        totalPoints: (playerData === null || playerData === void 0 ? void 0 : playerData.dealPoint) || 0,
                        points: (playerData === null || playerData === void 0 ? void 0 : playerData.points) || 0,
                        meld: meldLabel,
                        group: playerData === null || playerData === void 0 ? void 0 : playerData.groupingCards,
                        tenant: playerData.tenant,
                    });
                }
            });
            const declareScoreBoardData = {
                tableId,
                wildCard,
                playerInfo: scoreBoardPlayerInfo,
            };
            yield socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.ROUND_DECLARE_SCOREBOARD, declareScoreBoardData);
        });
    }
    helperAllPlayersFinished(tableInfo, tableGamePlay, playerList, declarePlayerInfo, playerGamePlay, userObjectId, currentRound) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(' helperAllPlayersFinished :', [
                tableInfo._id,
                tableInfo,
                tableGamePlay,
                playerList,
                declarePlayerInfo,
                playerGamePlay,
                userObjectId,
                currentRound,
            ]);
            let invalidFinishData;
            try {
                const tableId = tableInfo._id;
                const playerInfo = playerList;
                let playersIndex = playerInfo.map((id) => id.seatIndex);
                playersIndex = underscore_1.default.without(playersIndex, declarePlayerInfo.seatIndex);
                const sequenceCount = cards_1.cardUtils.sequenceCount(declarePlayerInfo.meld);
                /**
                 * If declarePlayer has left the game after declaring
                 * Ignore the declare & resume the game and change the turn
                 */
                if (tableGamePlay.declarePlayer &&
                    declarePlayerInfo.userStatus === constants_1.PLAYER_STATE.LEFT) {
                    invalidFinishData = {
                        tableId: tableId,
                        userId: declarePlayerInfo.seatIndex,
                        openCard: tableGamePlay.opendDeck[tableGamePlay.opendDeck.length - 1],
                        score: playerGamePlay.points,
                    };
                    yield (0, turn_1.changeTurn)(tableInfo._id);
                }
                else {
                    /**
                     * Else proceed with the round / game winner logic
                     */
                    // declare user has valid rummy hence set winner
                    const declPlayerValid = cards_1.cardUtils.areSequencesValid(declarePlayerInfo.meld);
                    const currentRoundHistory = yield index_1.turnHistoryService.getTurnHistory(tableId, currentRound);
                    currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].turnStatus = turnHistory_1.TURN_HISTORY.VALID_DECLARE;
                    currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].points = declarePlayerInfo.points;
                    /**
                     * If declarePlayer has valid declare
                     */
                    if (declPlayerValid) {
                        if ((0, utils_1.isPointsRummyFormat)(tableInfo.gameType)) {
                            const winnerData = yield winnerPoints_1.winnerPoints.declareWinner(tableId);
                            return winnerData;
                        }
                        else {
                            const winnerData = yield winner_1.winner.handleWinner(playerGamePlay, tableInfo, tableGamePlay);
                            return winnerData;
                        }
                    }
                    currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].turnStatus = turnHistory_1.TURN_HISTORY.INVALID_DECLARE;
                    yield this.handleOtherPlayers(tableInfo, playerInfo, playerGamePlay, currentRound, tableGamePlay);
                    newLogger_1.Logger.info('finally calling dropGame inside helperAllPlayersFinished----', [
                        tableId,
                        userObjectId,
                        tableInfo,
                        tableGamePlay,
                        playerList,
                        declarePlayerInfo,
                        playerGamePlay,
                        userObjectId,
                        currentRound,
                    ]);
                    yield (0, dropGame_1.dropGame)({ tableId: tableId }, { userId: userObjectId });
                    index_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory);
                }
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR CATCH_ERROR:', [
                    'helperAllPlayersFinished',
                    tableInfo._id,
                    error.message,
                    error,
                    tableInfo,
                ]);
                invalidFinishData = { error: error.message };
            }
            finally {
                if (tableGamePlay.declarePlayer === userObjectId &&
                    invalidFinishData &&
                    invalidFinishData.declarePlayer) {
                    yield socketOperation_1.socketOperation.sendEventToRoom(tableInfo._id, constants_1.EVENTS.INVALID_DECLARE_FINISH, invalidFinishData);
                }
            }
            return true;
        });
    }
    handleOtherPlayers(tableInfo, playerInfo, playerGamePlay, currentRound, tableGamePlay) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info('otherPlayer :', [
                tableInfo._id,
                tableInfo,
                playerInfo,
                playerGamePlay,
                currentRound,
                tableGamePlay,
            ]);
            playerInfo.map((playerData) => __awaiter(this, void 0, void 0, function* () {
                if (!underscore_1.default.isEmpty(playerData) &&
                    playerData.userStatus !== null &&
                    playerData.userStatus === constants_1.PLAYER_STATE.FINISH) {
                    const player = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(playerData.userId, tableInfo._id, currentRound, ['userStatus']);
                    if (!player)
                        throw new Error(`Player data not set at handleOtherplayers`);
                    player.userStatus = constants_1.PLAYER_STATE.PLAYING;
                    yield playerGameplay_1.playerGameplayService.setPlayerGameplay(playerData.userId, tableInfo._id, currentRound, player);
                }
            }));
            // await setTGPData(
            //   tableInfo,
            //   currentRound,
            //   tableGamePlay,
            //   playerGamePlay,
            // );
        });
    }
    setFinishAfter(userIdArray, tableId, currentRound) {
        return __awaiter(this, void 0, void 0, function* () {
            const [tableGameData, tableConfigData] = yield Promise.all([
                tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                    'seats',
                ]),
                tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    'gameType',
                ]),
            ]);
            if (!tableGameData) {
                throw new Error(`tableGameData not found table: ${tableId}-${currentRound}, from setFinishAfter`);
            }
            const { seats } = tableGameData;
            const playersGameData = yield Promise.all(seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, ['meld', 'userId', 'userStatus', 'groupingCards'])));
            newLogger_1.Logger.info('autoFinish', [
                tableId,
                userIdArray,
                playersGameData,
            ]);
            if (userIdArray && userIdArray.length) {
                for (let i = 0; i < userIdArray.length; i++) {
                    const userObjectId = userIdArray[i];
                    const playerOne = playersGameData.find((pl) => (pl === null || pl === void 0 ? void 0 : pl.userId) === userObjectId &&
                        (pl.userStatus === constants_1.PLAYER_STATE.PLAYING ||
                            pl.userStatus === constants_1.PLAYER_STATE.DECLARED));
                    if (playerOne) {
                        if (tableConfigData.gameType === constants_1.RUMMY_TYPES.DEALS) {
                            yield finishGame_1.finishGameDeals.finishGame(playerOne.meld, tableId, playerOne.userId, playerOne.groupingCards);
                        }
                        else {
                            yield this.finishGame(playerOne.meld, tableId, playerOne.userId, playerOne.groupingCards);
                        }
                    }
                }
            }
            return true;
        });
    }
    finishRound(data, socket, networkParams) {
        return __awaiter(this, void 0, void 0, function* () {
            let lock;
            try {
                let { group } = data;
                const { tableId } = data;
                const { userId } = socket;
                lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 2000);
                newLogger_1.Logger.info(`Lock acquired, in finishRound on resource:, ${lock.resource}`);
                const tableConfig = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, ['currentRound', 'maximumPoints', 'gameType']);
                const { currentRound } = tableConfig;
                const [tableGameplayData, playerGameplayData] = yield Promise.all([
                    tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['trumpCard']),
                    playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, ['currentCards', 'groupingCards']),
                ]);
                if (!tableGameplayData || !playerGameplayData) {
                    throw new Error(`tableGameplayData or playerGameplayData not found table: ${tableId}-${currentRound}, from finishRound`);
                }
                if (!(0, utils_1.issGroupingCardAndCurrentCardSame)([...playerGameplayData.currentCards], group)) {
                    newLogger_1.Logger.info(`Grouping is not the same between client and server in finish ${tableId}:${userId}, group ${group} and current grouping ${playerGameplayData.groupingCards}`);
                    group = playerGameplayData.groupingCards;
                }
                if (!tableGameplayData)
                    throw new Error(`Gameplay data not set finish Round`);
                const { meld, score, meldLabel } = cardHandler_1.cardHandler.groupCardsOnMeld(group, tableGameplayData.trumpCard, tableConfig.maximumPoints);
                if (tableConfig.gameType === constants_1.RUMMY_TYPES.DEALS) {
                    yield finishGame_1.finishGameDeals.finishGame(meld, tableId, userId, group, networkParams);
                }
                else {
                    yield this.finishGame(meld, tableId, userId, group, networkParams);
                }
                return {
                    tableId,
                    score,
                    meld: meldLabel,
                    group,
                    isValid: true, // change this
                };
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR finishRound `, [err]);
            }
            finally {
                try {
                    if (lock && lock instanceof redlock_1.Lock) {
                        yield redlock_2.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in finishRound; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on finishRound: ${err}`, [err]);
                }
            }
        });
    }
}
exports.finishGame = new FinishGame();
