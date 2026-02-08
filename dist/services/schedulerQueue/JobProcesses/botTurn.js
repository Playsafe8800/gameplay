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
exports.BotTurn = void 0;
const newLogger_1 = require("../../../newLogger");
const init_1 = require("../init");
const pickFromClosedDeck_1 = require("../../../services/moves/pickFromClosedDeck");
const index_1 = require("../index");
const constants_1 = require("../../../constants");
const tableConfiguration_1 = require("../../../db/tableConfiguration");
const tableGameplay_1 = require("../../../db/tableGameplay");
const playerGameplay_1 = require("../../../db/playerGameplay");
const dropGame_1 = require("../../../services/finishEvents/dropGame");
const pickFromOpenDeck_1 = require("../../../services/moves/pickFromOpenDeck");
const userService_1 = __importDefault(require("../../../userService"));
const cardHandler_1 = require("../../gameplay/cardHandler");
const instrumentedWorker_1 = require("../instrumentedWorker");
class BotTurn extends init_1.Initializer {
    constructor() {
        super(`botTurn`);
        this.addBotTurn = (tableId, userId, botTurnCount, timer) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`Adding To Queue addBotTurn ${tableId}, ${timer}`);
                const jobId = this.getJobId(tableId, userId);
                const dataTableStartQueue = {
                    tableId,
                    userId,
                    botTurnCount,
                };
                yield this.Queue.add(this.Queue.name, dataTableStartQueue, Object.assign({ delay: timer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError AddBotTurnQueue ${tableId} ${error.message}`);
            }
        });
        this.addBotTurnProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('addBotTurnProcess scheduler processed: ', [
                    job.data,
                ]);
                const { tableId, userId, botTurnCount } = job.data;
                const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, ['currentRound', 'maximumSeat', 'gameType']);
                if (!tableConfigData) {
                    throw new Error(`Table data is not set correctly ${tableId}`);
                }
                const tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, tableConfigData.currentRound, ['tableState', 'trumpCard', 'opendDeck', 'isFirstTurn']);
                if (!tableGameData)
                    throw new Error(`TableGamePlay not found, ${tableId}`);
                if (tableGameData.tableState !== constants_1.TABLE_STATE.ROUND_STARTED) {
                    return;
                }
                const playerGamePlayData = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, tableConfigData.currentRound, ['currentCards', 'groupingCards', 'isFirstTurn', 'turnCount']);
                if (!playerGamePlayData)
                    throw new Error(`playerGamePlay not found, ${tableId}`);
                if (playerGamePlayData.currentCards.length > 13)
                    throw new Error(`Invalid currentcards, ${tableId} ${playerGamePlayData.currentCards} ${tableConfigData.currentRound}`);
                if (playerGamePlayData.turnCount === 0 &&
                    (tableConfigData.gameType === constants_1.RUMMY_TYPES.POOL ||
                        tableConfigData.gameType === constants_1.RUMMY_TYPES.POINTS)) {
                    const cohorts = constants_1.BOT_CONFIG.DROP_COHORT.split(",");
                    const { shouldDrop, groupCards } = yield userService_1.default.drop(playerGamePlayData.currentCards, tableGameData.trumpCard, 
                    // @ts-ignore
                    cohorts.map((e) => {
                        e = Number(e);
                        return e;
                    }), tableGameData.opendDeck[tableGameData.opendDeck.length - 1], tableConfigData.maximumSeat === 2 ? 1 : 2, tableId);
                    if (shouldDrop) {
                        const { score: points, meld } = cardHandler_1.cardHandler.groupCardsOnMeld(groupCards, tableGameData.trumpCard, tableConfigData.maximumPoints);
                        playerGamePlayData.groupingCards = groupCards;
                        playerGamePlayData.meld = meld;
                        playerGamePlayData.points = points;
                        yield playerGameplay_1.playerGameplayService.setPlayerGameplay(playerGamePlayData.userId, tableId, tableConfigData.currentRound, playerGamePlayData);
                        yield (0, dropGame_1.dropGame)({ tableId }, { userId }, constants_1.GAME_END_REASONS.DROP);
                        return job.data;
                    }
                }
                const isPickFromOpenDeck = yield userService_1.default.pick(playerGamePlayData.currentCards, tableGameData.opendDeck[tableGameData.opendDeck.length - 1], tableGameData.trumpCard, playerGamePlayData.isFirstTurn, tableId);
                if (isPickFromOpenDeck) {
                    yield (0, pickFromOpenDeck_1.pickFromOpenDeck)({ tableId }, { userId }, {
                        eventID: 9,
                        timeStamp: Date.now().toString(),
                        retryCount: 1,
                    }, true);
                }
                else {
                    yield (0, pickFromClosedDeck_1.pickFromClosedDeck)({ tableId }, { userId }, {
                        eventID: 9,
                        timeStamp: Date.now().toString(),
                        retryCount: 1,
                    }, true);
                }
                const ran = Math.floor(Math.random() * (constants_1.NUMERICAL.SIX - constants_1.NUMERICAL.TWO + 1) +
                    constants_1.NUMERICAL.TWO);
                yield index_1.scheduler.addJob.botThrow(tableId, userId, Math.ceil(constants_1.NUMERICAL.TWENTY / ran) * constants_1.NUMERICAL.THOUSAND);
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError addBotTurnProcess', [error, job]);
                throw error;
            }
        });
        this.cancelBotTurn = (tableId, userId) => __awaiter(this, void 0, void 0, function* () {
            const jobId = this.getJobId(tableId, userId);
            try {
                const job = yield this.Queue.getJob(jobId);
                if (job) {
                    yield job.remove();
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError cancelBotTurn ${jobId} => ${error.message}`, error);
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.addBotTurnProcess(job), Object.assign({ connection: this.Queue.opts.connection, 
            // Use the same prefix as the Queue to ensure workers see the jobs
            prefix: this.Queue.opts.prefix }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId, userId) {
        return `${tableId}:${userId}:botTurn`;
    }
}
exports.BotTurn = BotTurn;
