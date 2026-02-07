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
exports.ScoreBoard = void 0;
const newLogger_1 = require("../../../newLogger");
const winner_1 = require("../../finishEvents/winner");
const init_1 = require("../init");
const instrumentedWorker_1 = require("../instrumentedWorker");
class ScoreBoard extends init_1.Initializer {
    constructor() {
        super(`scoreBoard`);
        this.addScoreBoard = (tableId, currentRound, playingPlayers, grpcResponse, isNewGameTableUI, isPointsRummy) => __awaiter(this, void 0, void 0, function* () {
            const timer = isNewGameTableUI ? 2000 : 4000;
            try {
                newLogger_1.Logger.info(`Adding To Queue addScoreBoard ${tableId}, ${timer} , grpc is ${JSON.stringify(grpcResponse)}`);
                const jobId = this.getJobId(tableId);
                const dataTableStartQueue = {
                    tableId,
                    currentRound,
                    playingPlayers,
                    grpcResponse,
                    isPointsRummy,
                };
                yield this.Queue.add(this.Queue.name, dataTableStartQueue, Object.assign({ delay: timer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError scoreBoardQueue ${tableId} ${error.message}`);
            }
        });
        this.scoreBoardProcess = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('scoreBoardProcess scheduler processed: ', [
                    job.data,
                ]);
                const { tableId, currentRound, isPointsRummy, grpcResponse } = job.data;
                // start processing here
                yield winner_1.winner.showScoreboard(tableId, currentRound, grpcResponse, isPointsRummy);
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError scoreBoardProcess', [error, job]);
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.scoreBoardProcess(job), Object.assign({ connection: this.Queue.opts.connection, prefix: `{${this.Queue.name}}` }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId) {
        return `${tableId}:SCB`;
    }
}
exports.ScoreBoard = ScoreBoard;
