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
exports.RoundStart = void 0;
const newLogger_1 = require("../../../newLogger");
const round_1 = require("../../gameplay/round");
const init_1 = require("../init");
const instrumentedWorker_1 = require("../instrumentedWorker");
class RoundStart extends init_1.Initializer {
    constructor() {
        super(`roundStart`);
        this.addRoundStart = (tableId, timer) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`Adding To Queue addRoundStart ${tableId}, ${timer}`);
                const jobId = this.getJobId(tableId);
                const dataTableStartQueue = {
                    tableId,
                };
                yield this.Queue.add(this.Queue.name, dataTableStartQueue, Object.assign({ delay: timer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError roundStartQueue ${tableId} ${error.message}`);
            }
        });
        this.roundStartProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('roundStartProcess scheduler processed: ', [
                    job.data,
                ]);
                // start processing here
                yield round_1.round.startRound(job.data.tableId);
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError roundStartProcess', [error, job]);
                throw error;
            }
        });
        this.cancelRoundStart = (tableId) => __awaiter(this, void 0, void 0, function* () {
            const jobId = this.getJobId(tableId);
            try {
                const job = yield this.Queue.getJob(jobId);
                if (job) {
                    yield job.remove();
                    // process here
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError cancelRoundStart ${jobId} => ${error.message}`, [error]);
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.roundStartProcess(job), Object.assign({ connection: this.Queue.opts.connection, prefix: `{${this.Queue.name}}` }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId) {
        return `${tableId}:${Date.now()}`;
    }
}
exports.RoundStart = RoundStart;
