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
const newLogger_1 = require("../newLogger");
const zk_1 = __importDefault(require("./zk"));
const ioredis_1 = __importDefault(require("ioredis"));
class RedisI {
    constructor() {
        this.connectionCallback = (resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (this.queryClient && this.queryClient instanceof ioredis_1.default) {
                resolve(this.queryClient);
                return;
            }
            const { GAMEPLAY_REDIS_HOST, GAMEPLAY_REDIS_PASSWORD, GAMEPLAY_REDIS_PORT, } = zk_1.default.getConfig();
            const redisOptions = Object.assign({ host: GAMEPLAY_REDIS_HOST, port: GAMEPLAY_REDIS_PORT }, (GAMEPLAY_REDIS_PASSWORD && { password: GAMEPLAY_REDIS_PASSWORD }));
            newLogger_1.Logger.info({
                host: GAMEPLAY_REDIS_HOST,
                port: GAMEPLAY_REDIS_PORT,
            });
            this.queryClient = new ioredis_1.default(redisOptions);
            this.queryClient.on('error', (error) => {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR Redis Client error : ', [error]);
                reject(error);
            });
            this.queryClient.on('ready', () => {
                newLogger_1.Logger.info('Redis connected successfully');
                resolve(this.queryClient);
            });
        });
        this.init = () => __awaiter(this, void 0, void 0, function* () { return new Promise(this.connectionCallback); });
    }
}
exports.default = new RedisI();
