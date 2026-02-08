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
exports.Bot = void 0;
const newLogger_1 = require("../../../newLogger");
const init_1 = require("../init");
const addTable_1 = require("../../signUp/addTable");
const instrumentedWorker_1 = require("../instrumentedWorker");
class Bot extends init_1.Initializer {
    constructor() {
        super(`bot`);
        this.addBot = (tableId, currentRound, timer) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`Adding To Queue addBot ${tableId}, ${timer}`);
                const jobId = this.getJobId(tableId, currentRound);
                const dataTableStartQueue = {
                    tableId,
                    currentRound,
                };
                yield this.Queue.add('test', { test: true }, { delay: 1000 });
                yield this.Queue.add(this.Queue.name, dataTableStartQueue, Object.assign({ delay: timer, jobId: `${jobId}-${timer}` }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError AddBotQueue ${tableId} ${error.message}`, [error]);
            }
        });
        this.addBotProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('addBotProcess scheduler processed: ', [job.data]);
                yield (0, addTable_1.sitBotOnTable)(job.data.tableId);
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError addBotProcess', [error, job]);
                throw error;
            }
        });
        this.cancelBot = (tableId, currentRound) => __awaiter(this, void 0, void 0, function* () {
            const jobId = this.getJobId(tableId, currentRound);
            try {
                const job = yield this.Queue.getJob(jobId);
                if (job) {
                    yield job.remove();
                    // process here
                }
                newLogger_1.Logger.info('job cancelled ...', [tableId, currentRound]);
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError cancelBot ${jobId} => ${error.message}`, [error]);
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.addBotProcess(job), Object.assign({ connection: this.Queue.opts.connection, 
            // Use the same prefix as the Queue to ensure workers see the jobs
            prefix: this.Queue.opts.prefix }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId, currentRound) {
        return `${tableId}:${currentRound}:bot`;
    }
}
exports.Bot = Bot;
