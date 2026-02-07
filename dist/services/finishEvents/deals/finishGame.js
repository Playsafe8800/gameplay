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
exports.finishGameDeals = void 0;
const newLogger_1 = require("../../../newLogger");
const tableConfiguration_1 = require("../../../db/tableConfiguration");
const tableGameplay_1 = require("../../../db/tableGameplay");
const playerGameplay_1 = require("../../../db/playerGameplay");
const constants_1 = require("../../../constants");
const cardHandler_1 = require("../../gameplay/cardHandler");
const cards_1 = require("../../../utils/cards");
const utils_1 = require("../../../utils");
const objectModels_1 = require("../../../objectModels");
const constants_2 = require("../../../constants");
const socketOperation_1 = require("../../../socketHandler/socketOperation");
const events_1 = require("../../../constants/events");
const events_2 = require("../../../state/events");
const date_1 = require("../../../utils/date");
const schedulerQueue_1 = require("../../schedulerQueue");
const constants_3 = require("../../../constants");
const turnHistory_1 = require("../../../db/turnHistory");
const constants_4 = require("../../../constants");
const declareCard_1 = require("../declareCard");
const dropGame_1 = require("../dropGame");
const finishGame_1 = require("../finishGame");
const underscore_1 = __importDefault(require("underscore"));
const turn_1 = require("../../gameplay/turn");
const winner_1 = require("../winner");
class FinishGame {
    finishGame(meld, tableId, userId, group, networkParams) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`Finish game deals called tableId: ${tableId}, userId: ${userId}`);
                const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    '_id',
                    'currentRound',
                    'maximumPoints',
                    'userFinishTimer',
                    'gameType',
                ]);
                const { currentRound } = tableConfigData;
                const tableGameplayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                    'seats',
                    'trumpCard',
                    'declarePlayer',
                    'finishPlayer',
                    'pointsForRoundWinner',
                    'opendDeck',
                    'closedDeck',
                    'trumpCard',
                ]);
                if (!tableGameplayData) {
                    throw Error(`TGP not found for table ${tableId} for finishGame`);
                }
                const { seats, trumpCard, declarePlayer } = tableGameplayData;
                const pgps = yield this.getCurrentPlayerGameData(seats, tableId, currentRound);
                const declarePlayerGameData = pgps.find((ele) => (ele === null || ele === void 0 ? void 0 : ele.userId) === declarePlayer);
                const playersGameData = [];
                pgps.forEach((pgp) => {
                    if (pgp)
                        playersGameData.push(pgp);
                });
                const finishPlayerGameData = playersGameData.find((ele) => ele.userId === userId) ||
                    {};
                if (!finishPlayerGameData || !declarePlayerGameData)
                    throw new Error(`Value not found for finish player or declare player game data ${tableId}`);
                yield this.handleFinish(finishPlayerGameData, tableConfigData, tableGameplayData, meld, group, userId, networkParams, playersGameData, declarePlayerGameData);
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error occurred at finishGame ${tableId}`, [err]);
                throw new Error(err);
            }
        });
    }
    getCurrentPlayerGameData(seats, tableId, currentRound) {
        return __awaiter(this, void 0, void 0, function* () {
            const pgps = yield Promise.all(seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, [
                'userId',
                'seatIndex',
                'meld',
                'userStatus',
                'dealPoint',
                'points',
                'groupingCards',
                'tenant',
                'isFirstTurn',
            ])));
            return pgps;
        });
    }
    handleFinish(finishPlayerGameData, tableConfigData, tableGameplayData, meld, group, userId, networkParams, playersGameData, declarePlayerGameData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (finishPlayerGameData.userStatus === constants_1.PLAYER_STATE.DECLARED ||
                finishPlayerGameData.userStatus === constants_1.PLAYER_STATE.PLAYING) {
                const { _id: tableId, currentRound } = tableConfigData;
                const { seats, trumpCard, declarePlayer } = tableGameplayData;
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
                // finishPlayerGameData.dealPoint = cardPoints;
                finishPlayerGameData.userStatus = constants_1.PLAYER_STATE.FINISH;
                finishPlayerGameData.points = cardPoints;
                newLogger_1.Logger.info('-finishPlayerGameData.dealPoint-gg-', [
                    finishPlayerGameData.dealPoint,
                    finishPlayerGameData.points,
                    '--finishPlayerGameData.points---',
                    finishPlayerGameData.userId,
                    cardPoints,
                    tableId,
                ]);
                tableGameplayData.finishPlayer.push(finishPlayerGameData.userId);
                const sequenceCount = cards_1.cardUtils.sequenceCount(meld);
                if (cardPoints === 0 &&
                    declarePlayer !== finishPlayerGameData.userId &&
                    sequenceCount[objectModels_1.MELD.PURE] + sequenceCount[objectModels_1.MELD.SEQUENCE] > 1) {
                    finishPlayerGameData.points = constants_2.NUMERICAL.TWO;
                }
                const finishRoundEventData = {
                    tableId,
                    userId,
                    totalPoints: finishPlayerGameData.dealPoint,
                };
                yield Promise.all([
                    socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.FINISH_ROUND, finishRoundEventData),
                    events_2.eventStateManager.fireEventUser(tableId, userId, events_1.USER_EVENTS.FINISH, (networkParams === null || networkParams === void 0 ? void 0 : networkParams.timeStamp) || date_1.dateUtils.getCurrentEpochTime()),
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
                        (0, utils_1.deductScoreForDeals)(finishPlayerGameData, tableGameplayData, constants_3.POINTS.LATE_DECLARE_PENALTY_POINTS);
                    }
                    else {
                        (0, utils_1.deductScoreForDeals)(finishPlayerGameData, tableGameplayData, cardPoints);
                    }
                    // finishPlayerGameData.dealPoint += finishPlayerGameData.points;
                    // declarePlayerGameData.dealPoint +=
                    //   declarePlayerGameData.points;
                    newLogger_1.Logger.info('--finishPlayerGameData.dealPoint--kk', [
                        finishPlayerGameData.dealPoint,
                        finishPlayerGameData.points,
                        '--finishPlayerGameData.points;--',
                        declarePlayerGameData.dealPoint,
                        '--declarePlayerGameData.dealPoint--',
                        declarePlayerGameData.points,
                        '--declarePlayerGameData.points--',
                        cardPoints,
                        tableId,
                    ]);
                    yield playerGameplay_1.playerGameplayService.setPlayerGameplay(declarePlayerGameData.userId, tableId, currentRound, declarePlayerGameData);
                }
                newLogger_1.Logger.info(`finishGame: update tgp, pgp for table: ${tableId}`, [
                    tableGameplayData,
                    finishPlayerGameData,
                    declarePlayerGameData,
                ]);
                yield Promise.all([
                    tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameplayData),
                    playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, finishPlayerGameData),
                ]);
                let isInvalidDeclare = false;
                if (userId === declarePlayer &&
                    isValidSequence &&
                    cardPoints === constants_2.NUMERICAL.ZERO) {
                    yield Promise.all([
                        declareCard_1.declareCardEvent.scheduleFinishTimer(tableConfigData, tableGameplayData, playersGameData, true),
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
                            socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.INVALID_DECLARE_FINISH, invalidFinishData),
                        ]);
                    }
                    yield (0, dropGame_1.dropGame)({ tableId }, { userId }, constants_3.GAME_END_REASONS.INVALID_DECLARE);
                }
                /**
                 * send room event with player data to show declaring scoreboard
                 */
                if (!isInvalidDeclare) {
                    yield finishGame_1.finishGame.showRoundDeclaredScoreBoard(tableId, seats, playersGameData, tableGameplayData.trumpCard);
                }
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
                    yield playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, finishPlayerGameData);
                    newLogger_1.Logger.info(' helperAllPlayersFinished is called -----', [
                        tableId,
                        playersGameData,
                    ]);
                    yield this.helperAllPlayersFinished(tableConfigData, tableGameplayData, playersGameData, declarePlayerGameData, finishPlayerGameData, userId, currentRound);
                }
            }
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
                    // const pureCnt = sequenceCount[MELD.PURE];
                    // const seqCnt = sequenceCount[MELD.SEQUENCE];
                    invalidFinishData = {
                        tableId: tableGamePlay._id,
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
                    // const declPureCount = sequenceCount[MELD.PURE];
                    // const declSeqCount = sequenceCount[MELD.SEQUENCE];
                    const currentRoundHistory = yield turnHistory_1.turnHistoryService.getTurnHistory(tableId, currentRound);
                    currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].turnStatus = constants_4.TURN_HISTORY.VALID_DECLARE;
                    currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].points = declarePlayerInfo.points;
                    /**
                     * If declarePlayer has valid declare
                     */
                    if (declPlayerValid) {
                        const winnerData = yield winner_1.winner.handleWinner(playerGamePlay, tableInfo, tableGamePlay);
                        return winnerData;
                    }
                    currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1].turnStatus = constants_4.TURN_HISTORY.INVALID_DECLARE;
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
                    turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory);
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
                    yield socketOperation_1.socketOperation.sendEventToRoom(tableGamePlay._id, events_1.EVENTS.INVALID_DECLARE_FINISH, invalidFinishData);
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
        });
    }
}
exports.finishGameDeals = new FinishGame();
