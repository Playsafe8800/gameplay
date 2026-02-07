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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundTimerStart = void 0;
const newLogger_1 = require("../../../newLogger");
const winner_1 = require("../../finishEvents/winner");
const init_1 = require("../init");
const instrumentedWorker_1 = require("../instrumentedWorker");
class RoundTimerStart extends init_1.Initializer {
    constructor() {
        super(`roundTimerStart`);
        this.addRoundTimerStart = (tableId, currentRound, nextRoundTimer, eliminatedPlayers, isTableRejoinable) => __awaiter(this, void 0, void 0, function* () {
            const delayTimer = 3000;
            newLogger_1.Logger.info(`Adding To Queue addRoundTimerStart ${tableId}, ${delayTimer}, ${nextRoundTimer}`);
            const jobId = this.getJobId(tableId, currentRound);
            try {
                const dataTableStartQueue = {
                    tableId,
                    currentRound,
                    nextRoundTimer,
                    eliminatedPlayers,
                    isTableRejoinable,
                };
                yield this.Queue.add(this.Queue.name, dataTableStartQueue, Object.assign({ delay: delayTimer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError roundTimerStartQueue ${jobId} ${error.message}`, [error]);
            }
        });
        this.roundTimerStartProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('roundTimerStartProcess scheduler processed: ', [
                    job.data,
                ]);
                const { nextRoundTimer, tableId, currentRound, eliminatedPlayers, isTableRejoinable, } = job.data;
                yield winner_1.winner.handleRoundTimerExpired({
                    nextRoundTimer,
                    tableId,
                    currentRound,
                    eliminatedPlayers,
                    isTableRejoinable,
                });
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError roundTimerStartProcess', [error, job]);
                throw error;
            }
        });
        this.cancelRoundTimerStart = (tableId, currentRound) => __awaiter(this, void 0, void 0, function* () {
            const jobId = this.getJobId(tableId, currentRound);
            try {
                const job = yield this.Queue.getJob(jobId);
                if (job) {
                    yield job.remove();
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError cancelRoundTimerStart ${jobId} => ${error.message}`, [error]);
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.roundTimerStartProcess(job), Object.assign({ connection: this.Queue.opts.connection, prefix: `{${this.Queue.name}}` }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId, currentRound) {
        return `${tableId}:${currentRound}`;
    }
}
exports.RoundTimerStart = RoundTimerStart;
