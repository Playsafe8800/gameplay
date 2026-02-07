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
exports.PlayMoreDelay = void 0;
const newLogger_1 = require("../../../newLogger");
const playMore_1 = __importDefault(require("../../../services/playMore"));
const init_1 = require("../init");
const instrumentedWorker_1 = require("../instrumentedWorker");
class PlayMoreDelay extends init_1.Initializer {
    constructor() {
        super(`playMoreDelay`);
        this.addPlayMoreDelay = (tableId, tableInfo, players, finalDataGrpc, tableConfigData) => __awaiter(this, void 0, void 0, function* () {
            const timer = 10000;
            try {
                newLogger_1.Logger.info(`Adding To Queue addPlayMoreDelay ${tableId}, ${timer}`);
                const jobId = this.getJobId(tableId);
                const dataPlayMoreDelayQueue = {
                    tableId,
                    tableInfo,
                    players,
                    finalDataGrpc,
                    tableConfigData,
                };
                yield this.Queue.add(this.Queue.name, dataPlayMoreDelayQueue, Object.assign({ delay: timer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError playMoreDelayQueue ${tableId} ${error.message}`, error);
            }
        });
        this.playMoreDelayProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('playMoreDelayProcess scheduler processed: ', [
                    job.data,
                ]);
                // start processing here
                yield playMore_1.default.checkPlayAgainAndUpsellData(job.data.tableId, job.data.tableInfo, job.data.players, job.data.finalDataGrpc, job.data.tableConfigData);
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError playMoreDelayProcess', [error, job]);
                throw error;
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.playMoreDelayProcess(job), Object.assign({ connection: this.Queue.opts.connection, prefix: `{${this.Queue.name}}` }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId) {
        return `${tableId}:playMore`;
    }
}
exports.PlayMoreDelay = PlayMoreDelay;
