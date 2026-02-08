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
exports.InitialTurnSetupTimer = void 0;
const newLogger_1 = require("../../../newLogger");
const round_1 = require("../../../services/gameplay/round");
const init_1 = require("../init");
const instrumentedWorker_1 = require("../instrumentedWorker");
class InitialTurnSetupTimer extends init_1.Initializer {
    constructor() {
        super(`initialTurnSetupTimer`);
        this.addInitialTurnSetupTimer = (params, timer) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`Adding To Queue addInitialTurnSetupTimer ${params === null || params === void 0 ? void 0 : params.tableId}, ${timer}`);
                const jobId = this.getJobId(params.tableId, params.roundNumber);
                yield this.Queue.add(this.Queue.name, params, Object.assign({ delay: timer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError initialTurnSetupQueue ${params === null || params === void 0 ? void 0 : params.tableId} ${error.message}`);
            }
        });
        this.initialTurnSetupTimerProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('initialTurnSetupTimerProcess scheduler processed: ', [job.data]);
                const { tableId, roundNumber, nextTurn, userIds } = job.data;
                yield round_1.round.setupInitialTurn(tableId, roundNumber, nextTurn, userIds);
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError initialTurnSetupTimerProcess', [error, job]);
                throw error;
            }
        });
        this.cancelInitialTurnSetupTimer = (tableId, roundNumber) => __awaiter(this, void 0, void 0, function* () {
            const jobId = this.getJobId(tableId, roundNumber);
            try {
                const job = yield this.Queue.getJob(jobId);
                if (job) {
                    yield job.remove();
                    // process here
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError cancelinitialTurnSetupTimer ${jobId} => ${error.message}`, error);
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.initialTurnSetupTimerProcess(job), Object.assign({ connection: this.Queue.opts.connection, 
            // Use the same prefix as the Queue to ensure workers see the jobs
            prefix: this.Queue.opts.prefix }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId, currentRound) {
        return `${tableId}:${currentRound}:INITIAL`;
    }
}
exports.InitialTurnSetupTimer = InitialTurnSetupTimer;
