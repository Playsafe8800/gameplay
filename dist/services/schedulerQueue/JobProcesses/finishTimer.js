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
exports.FinishTimer = void 0;
const newLogger_1 = require("../../../newLogger");
const finishGame_1 = require("../../finishEvents/finishGame");
const init_1 = require("../init");
const instrumentedWorker_1 = require("../instrumentedWorker");
class FinishTimer extends init_1.Initializer {
    constructor() {
        super(`finishTimer`);
        this.addFinishTimer = (tableId, currentRound, userIds, timer, forOthers = false) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`Adding To Queue addFinishTimer ${tableId}, ${timer}`);
                const jobId = this.getJobId(tableId, currentRound, forOthers);
                const dataFinishTimerQueue = {
                    tableId,
                    currentRound,
                    userIds,
                };
                yield this.Queue.add(this.Queue.name, dataFinishTimerQueue, Object.assign({ delay: timer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError finishTimerQueue ${tableId} ${error.message}`, error);
            }
        });
        this.finishTimerProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('finishTimerProcess scheduler processed: ', [
                    job.data,
                ]);
                const { userIds, tableId, currentRound } = job.data;
                // start processing here
                yield finishGame_1.finishGame.setFinishAfter(userIds, tableId, currentRound);
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError finishTimerProcess', [error, job]);
                throw error;
            }
        });
        this.cancelFinishTimer = (tableId, currentRound, forOthers = false) => __awaiter(this, void 0, void 0, function* () {
            const jobId = this.getJobId(tableId, currentRound, forOthers);
            try {
                const job = yield this.Queue.getJob(jobId);
                if (job) {
                    yield job.remove();
                    // process here
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError cancelFinishTimer ${jobId} => ${error.message}`, [error]);
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.finishTimerProcess(job), Object.assign({ connection: this.Queue.opts.connection, 
            // Use the same prefix as the Queue to ensure workers see the jobs
            prefix: this.Queue.opts.prefix }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId, currentRound, forOthers) {
        return `${tableId}:${currentRound}:${forOthers}:FINISH`;
    }
}
exports.FinishTimer = FinishTimer;
