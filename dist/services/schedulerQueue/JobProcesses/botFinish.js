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
exports.BotFinish = void 0;
const newLogger_1 = require("../../../newLogger");
const init_1 = require("../init");
const finishGame_1 = require("../../../services/finishEvents/finishGame");
const instrumentedWorker_1 = require("../instrumentedWorker");
class BotFinish extends init_1.Initializer {
    constructor() {
        super(`botFinish`);
        this.addBotFinish = (tableId, userId, timer, group) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`Adding To Queue addBotFinish ${tableId}, ${timer}`);
                const jobId = this.getJobId(tableId, userId);
                const dataTableStartQueue = {
                    tableId,
                    userId,
                    group,
                };
                yield this.Queue.add(this.Queue.name, dataTableStartQueue, Object.assign({ delay: timer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError AddBotFinishQueue ${tableId} ${error.message}`, [error]);
            }
        });
        this.addBotFinishProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('addBotFinishProcess scheduler processed: ', [
                    job.data,
                ]);
                const { tableId, userId, group } = job.data;
                yield finishGame_1.finishGame.finishRound({ tableId, group }, { userId }, {
                    eventID: 9,
                    timeStamp: Date.now().toString(),
                    retryCount: 1,
                });
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError addBotFinishProcess', [error, job]);
                throw error;
            }
        });
        this.cancelBotFinish = (tableId, userId) => __awaiter(this, void 0, void 0, function* () {
            const jobId = this.getJobId(tableId, userId);
            try {
                const job = yield this.Queue.getJob(jobId);
                if (job) {
                    yield job.remove();
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError cancelBotFinish ${jobId} => ${error.message}`, [error]);
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.addBotFinishProcess(job), Object.assign({ connection: this.Queue.opts.connection, 
            // Use the same prefix as the Queue to ensure workers see the jobs
            prefix: this.Queue.opts.prefix }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId, userId) {
        return `${tableId}:${userId}:botFinish`;
    }
}
exports.BotFinish = BotFinish;
