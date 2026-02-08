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
exports.PlayerTurnTimer = void 0;
const newLogger_1 = require("../../../newLogger");
const turn_1 = require("../../gameplay/turn");
const init_1 = require("../init");
const instrumentedWorker_1 = require("../instrumentedWorker");
class PlayerTurnTimer extends init_1.Initializer {
    constructor() {
        super(`playerTurnTimer`);
        this.addPlayerTurnTimer = (tableId, userId, timer) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`Adding To Queue playerTurnTimer ${tableId}, ${timer}`);
                const jobId = this.getJobId(tableId, userId);
                const dataTableStartQueue = {
                    tableId,
                    userId,
                };
                yield this.Queue.add(this.Queue.name, dataTableStartQueue, Object.assign({ delay: timer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError playerTurnTimerQueue ${tableId} ${error.message}`, error);
            }
        });
        this.playerTurnTimerProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('playerTurnTimerProcess scheduler processed: ', [
                    job.data,
                ]);
                yield (0, turn_1.onTurnExpire)(job.data);
                // start processing here
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError playerTurnTimerProcess', [error, job]);
                throw error;
            }
        });
        this.cancelPlayerTurnTimer = (tableId, userId) => __awaiter(this, void 0, void 0, function* () {
            const jobId = this.getJobId(tableId, userId);
            try {
                const job = yield this.Queue.getJob(jobId);
                if (job) {
                    yield job.remove();
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError cancelPlayerTurnTimer ${jobId} => ${error.message}`, [error]);
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.playerTurnTimerProcess(job), Object.assign({ connection: this.Queue.opts.connection, 
            // Use the same prefix as the Queue to ensure workers see the jobs
            prefix: this.Queue.opts.prefix }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId, userId) {
        return `${tableId}:${userId}:TURN`;
    }
}
exports.PlayerTurnTimer = PlayerTurnTimer;
