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
const express_1 = __importDefault(require("express"));
const newLogger_1 = require("../newLogger");
const axios_1 = __importDefault(require("axios"));
const init_1 = require("../services/schedulerQueue/init");
const redis_1 = __importDefault(require("../connections/redis"));
const socket_1 = __importDefault(require("../connections/socket"));
class RouterClass {
    constructor() {
        this.HealthCheck = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const apiResponse = yield axios_1.default.get('http://127.0.0.1:3001/healthcheck');
                if (apiResponse.status === 200) {
                    const response = {
                        message: 'OK',
                        identity: process.pid,
                        uptime: process.uptime(),
                        timestamp: new Date().toISOString(),
                    };
                    res.status(200).json(response);
                }
                else {
                    res.status(503).json({ error: true, message: 'External service unavailable' });
                }
            }
            catch (error) {
                res.status(403).json({
                    error: true,
                    message: `${error}`,
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.ShutDown = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield init_1.Initializer.shutdownQueues();
                yield new Promise((resolve, reject) => {
                    redis_1.default.queryClient.quit((error, reply) => {
                        if (error)
                            newLogger_1.Logger.error('redis shutdown error', error.message);
                        else
                            newLogger_1.Logger.info('Redis connections closed.');
                        socket_1.default.socketClient.close((err) => {
                            if (err)
                                newLogger_1.Logger.error('socket shutdown error', err.message);
                            else
                                newLogger_1.Logger.info('socket connections closed.');
                            resolve(true);
                        });
                    });
                });
                res.status(200).json({ status: 'ok' });
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Exception in shutdown hook`, [error]);
                res
                    .status(400)
                    .json({ status: 'BadRequest', error: error.message });
            }
            finally {
                process.exit(0);
            }
        });
        this.router = express_1.default.Router();
        this.router.get('/healthcheck', this.HealthCheck);
        this.router.get('/shutdown', this.ShutDown);
        this.router.get('/', (_req, res) => {
            res.status(200).json('It Works...  ;)');
        });
        this.router.get('/update/config', (_req, res) => {
            res.status(200).json('config updated ...  ;)');
        });
        this.router.get('/test', (req, res) => {
            res.send('Http server is working...');
        });
    }
}
exports.default = new RouterClass().router;
