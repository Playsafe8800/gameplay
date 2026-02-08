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
exports.RemoveSocketFromTable = void 0;
const newLogger_1 = require("../../../newLogger");
const socketOperation_1 = require("../../../socketHandler/socketOperation");
const init_1 = require("../init");
const instrumentedWorker_1 = require("../instrumentedWorker");
class RemoveSocketFromTable extends init_1.Initializer {
    constructor() {
        super(`removeSocketFromTable`);
        this.addRemoveSocketFromTable = (timer, tableId, socketId) => __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(`Adding To Queue addRemoveSocketFromTable ${tableId}, ${timer}, ${socketId}`);
            const jobId = this.getJobId(tableId, socketId);
            try {
                const dataTableStartQueue = {
                    tableId,
                    socketId,
                };
                yield this.Queue.add(this.Queue.name, dataTableStartQueue, Object.assign({ delay: timer, jobId }, this.options));
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError addRemoveSocketFromTable ${jobId} ${error.message}`, error);
            }
        });
        this.removeSocketFromTable = (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('removeSocketFromTable scheduler processed: ', [
                    job.data,
                ]);
                const { tableId, socketId } = job.data;
                yield socketOperation_1.socketOperation.removeClientFromRoom(tableId, socketId);
                return job.data;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR SchedulerError removeSocketFromTable', [error, job]);
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
        this.worker = (0, instrumentedWorker_1.createInstrumentedWorker)(this.Queue.name, (job) => this.removeSocketFromTable(job), Object.assign({ connection: this.Queue.opts.connection, 
            // Use the same prefix as the Queue to ensure workers see the jobs
            prefix: this.Queue.opts.prefix }, this.workerOpts));
        this.worker.on('error', (err) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
        });
    }
    getJobId(tableId, socketId) {
        return `${tableId}:${socketId}`;
    }
}
exports.RemoveSocketFromTable = RemoveSocketFromTable;
