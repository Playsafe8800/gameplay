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
exports.Initializer = void 0;
const bull = require('bullmq');
const ioredis_1 = __importDefault(require("ioredis"));
const newLogger_1 = require("../../newLogger");
const connections_1 = require("../../connections");
class Initializer {
    constructor(QueueName) {
        this.options = {};
        this.workerOpts = {};
        const config = connections_1.zk.getConfig;
        const hostName = process.env.SCHEDULER_REDIS_HOST;
        const schedulerPort = process.env.SCHEDULER_REDIS_PORT;
        const redisPassword = process.env.SCHEDULER_REDIS_PASSWORD;
        this.redis = new ioredis_1.default(Object.assign({ host: `${hostName}`, port: Number.parseInt(`${schedulerPort}`) }, (redisPassword ? { password: redisPassword } : {})));
        const queueNameHash = `${QueueName}-${process.env.DEPLOYMENT_HASH}`;
        this.Queue = new bull.Queue(queueNameHash, {
            connection: this.redis,
            prefix: queueNameHash,
        });
        this.options = {
            attempts: 50,
            backoff: {
                type: 'fixed',
                delay: 500,
            },
            removeOnComplete: true,
            removeOnFail: { age: 600 } // 10 minutes
        };
        this.workerOpts = {
            removeOnFail: { age: 1800 },
            concurrency: 5
        };
        Initializer.queueMap.set(queueNameHash, this.Queue);
        this.Queue.on('error', (error) => {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error for Queue ${queueNameHash}: Error => `, [
                error,
            ]);
        });
    }
    static shutdownQueues() {
        return __awaiter(this, void 0, void 0, function* () {
            const queues = Array.from(Initializer.queueMap.values());
            yield Promise.all(queues.map((queue) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield queue.pause();
                    yield queue.obliterate();
                    newLogger_1.Logger.info(`Queue ${queue.name} paused and obliterated`);
                }
                catch (error) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Queue shutdown error: ${queue.name}`, [error]);
                }
            })));
            yield require('./index').scheduler.closeWorkers();
        });
    }
}
exports.Initializer = Initializer;
Initializer.queueMap = new Map();
