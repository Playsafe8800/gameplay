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
exports.BotThrow = void 0;
const newLogger_1 = require("../../../newLogger");
const init_1 = require("../init");
const tableConfiguration_1 = require("../../../db/tableConfiguration");
const playerGameplay_1 = require("../../../db/playerGameplay");
const throwCard_1 = require("../../../services/moves/throwCard");
const cardHandler_1 = require("../../../services/gameplay/cardHandler");
const tableGameplay_1 = require("../../../db/tableGameplay");
const index_1 = require("../index");
const constants_1 = require("../../../constants");
const leaveTable_1 = __importDefault(require("../../../services/leaveTable"));
const userService_1 = __importDefault(require("../../../userService"));
const userProfile_1 = require("../../../db/userProfile");
const instrumentedWorker_1 = require("../instrumentedWorker");
class BotThrow extends init_1.Initializer {
    constructor() {
        super(`botThrow`);
        this.addBotThrow = (tableId, userId, timer) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`Adding To Queue addBotThrow ${tableId}, ${timer}`);
                const jobId = this.getJobId(tableId, userId);
                const dataTableStartQueue = {
                    tableId,
                    userId,
                };
                yield this.Queue.add(this.Queue.name, dataTableStartQueue, Object.assign({ delay: timer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError AddBotThrowQueue ${tableId} ${error.message}`, [error]);
            }
        });
        this.addBotThrowProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                newLogger_1.Logger.info('addBotThrowProcess scheduler processed: ', [
                    job.data,
                ]);
                const { tableId, userId } = job.data;
                const tableConfig = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    'currentRound',
                    'maximumPoints',
                    'userTurnTimer',
                    'maximumSeat',
                    'currencyType',
                ]);
                const { currentRound } = tableConfig;
                const tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                    'trumpCard',
                    'closedDeck',
                    'opendDeck',
                    'tableState',
                    'currentTurn',
                    'seats',
                ]);
                if ((tableGameData === null || tableGameData === void 0 ? void 0 : tableGameData.currentTurn) !== userId)
                    return false;
                if (tableGameData &&
                    tableGameData.tableState !== constants_1.TABLE_STATE.ROUND_STARTED) {
                    yield leaveTable_1.default.main({
                        tableId,
                        isDropNSwitch: true,
                        reason: constants_1.LEAVE_TABLE_REASONS.ELIMINATED,
                    }, userId);
                    return;
                }
                const playerGamePlay = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, ['userId', 'currentCards', 'groupingCards']);
                let rejectedCards = [], pickedCards = [], opponentProfitLoss = 0;
                if (tableConfig.maximumSeat === 2) {
                    const opponentId = (_a = tableGameData.seats.find((element) => element._id !== userId)) === null || _a === void 0 ? void 0 : _a._id;
                    const [oppoPlayerGamePlay, opponentProfile] = yield Promise.all([
                        playerGameplay_1.playerGameplayService.getPlayerGameplay(opponentId, tableId, currentRound, ['rejectedCards', 'pickedCards']),
                        userProfile_1.userProfileService.getUserDetailsById(opponentId),
                    ]);
                    rejectedCards = oppoPlayerGamePlay.rejectedCards;
                    pickedCards = oppoPlayerGamePlay.pickedCards;
                    opponentProfitLoss = (opponentProfile === null || opponentProfile === void 0 ? void 0 : opponentProfile.profitLoss) || 0;
                }
                else {
                    yield Promise.all(tableGameData.seats.map((e) => __awaiter(this, void 0, void 0, function* () {
                        const profile = yield userProfile_1.userProfileService.getUserDetailsById(e._id);
                        if (!(profile === null || profile === void 0 ? void 0 : profile.isBot)) {
                            const oppoPlayerGamePlay = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(e._id, tableId, currentRound, ['rejectedCards', 'pickedCards', 'userStatus']);
                            if (oppoPlayerGamePlay.userStatus === constants_1.PLAYER_STATE.PLAYING) {
                                if (opponentProfitLoss <= 0)
                                    opponentProfitLoss = (profile === null || profile === void 0 ? void 0 : profile.profitLoss) || 0;
                                rejectedCards = rejectedCards.concat(oppoPlayerGamePlay.rejectedCards);
                                pickedCards = pickedCards.concat(oppoPlayerGamePlay.pickedCards);
                            }
                        }
                    })));
                }
                if (playerGamePlay && tableGameData) {
                    const decCount = tableConfig.maximumSeat === 2 ? 1 : 2;
                    const { thrownCard, isRummy, groupCards } = yield userService_1.default.throw(playerGamePlay.currentCards, tableGameData.trumpCard, decCount, tableGameData.opendDeck, tableId, tableConfig.currencyType === constants_1.CURRENCY_TYPE.COINS
                        ? undefined
                        : opponentProfitLoss > 0
                            ? rejectedCards
                            : undefined, tableConfig.currencyType === constants_1.CURRENCY_TYPE.COINS
                        ? undefined
                        : opponentProfitLoss > 0
                            ? pickedCards
                            : undefined);
                    const currentCard = groupCards.flat().filter((e) => e);
                    const { score: points, meld } = cardHandler_1.cardHandler.groupCardsOnMeld(groupCards, tableGameData.trumpCard, tableConfig.maximumPoints);
                    playerGamePlay.currentCards = currentCard;
                    playerGamePlay.groupingCards = groupCards;
                    playerGamePlay.meld = meld;
                    playerGamePlay.points = points;
                    playerGamePlay.isBotWinner = true;
                    playerGamePlay.groupingCards[playerGamePlay.groupingCards.length - 1].push(thrownCard);
                    playerGamePlay.currentCards.push(thrownCard);
                    yield playerGameplay_1.playerGameplayService.setPlayerGameplay(playerGamePlay.userId, tableId, currentRound, playerGamePlay);
                    if (isRummy) {
                        yield cardHandler_1.cardHandler.declareCard({
                            group: groupCards,
                            tableId,
                            card: thrownCard,
                        }, { userId }, {
                            eventID: 9,
                            timeStamp: Date.now().toString(),
                            retryCount: 1,
                        });
                        const ran = Math.floor(Math.random() * (constants_1.NUMERICAL.SIX - constants_1.NUMERICAL.TWO + 1) +
                            constants_1.NUMERICAL.TWO);
                        yield index_1.scheduler.addJob.botFinish(tableId, userId, Math.ceil(tableConfig.userTurnTimer / ran) *
                            constants_1.NUMERICAL.THOUSAND, groupCards);
                    }
                    else if (thrownCard) {
                        yield (0, throwCard_1.throwCard)({ tableId, card: thrownCard, group: groupCards }, { userId }, {
                            eventID: 9,
                            timeStamp: Date.now().toString(),
                            retryCount: 1,
                        }, true);
                    }
                    else {
                        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${tableId} ${userId} ${currentRound} WRONG_OUTPUT_BOT_SERVICE ${thrownCard}`);
                    }
                }
                else {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${tableId} ${userId} ${currentRound} pgp not found`);
                }
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError addBotThrowProcess', error, job);
                throw error;
            }
        });
        this.cancelBotThrow = (tableId, userId) => __awaiter(this, void 0, void 0, function* () {
            const jobId = this.getJobId(tableId, userId);
            try {
                const job = yield this.Queue.getJob(jobId);
                if (job) {
                    yield job.remove();
                    // process here
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError cancelBotThrow ${jobId} => ${error.message}`, error);
            }
        });
        this.closeWorker = () => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.worker.close();
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError closeWorker `, [error]);
            }
        });
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.addBotThrowProcess(job), Object.assign({ connection: this.Queue.opts.connection, prefix: `{${this.Queue.name}}` }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId, userId) {
        return `${tableId}:${userId}:botThrow`;
    }
    getPickedCard(currentCards, trumpCard) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.selectAndRemoveNonTrumpCard(currentCards, trumpCard);
        });
    }
    selectAndRemoveNonTrumpCard(currentCards, trumpCard) {
        const nonTrumpCards = currentCards.filter((c) => {
            const [rank, suit] = c.split('-');
            const [trumpRank, trumpSuit] = trumpCard.split('-');
            return (suit !== trumpSuit && rank !== trumpRank && c !== 'J-1-0');
        });
        const card = nonTrumpCards.pop() || currentCards.pop() || '';
        const index = currentCards.indexOf(card);
        if (index > -1) {
            currentCards.splice(index, 1);
        }
        return card;
    }
}
exports.BotThrow = BotThrow;
