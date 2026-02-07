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
const module_1 = __importDefault(require("./config/module"));
const http_1 = __importDefault(require("./connections/http"));
const redlock_1 = require("./utils/lock/redlock");
const newLogger_1 = require("./newLogger");
const redis_1 = __importDefault(require("./connections/redis"));
const socket_1 = __importDefault(require("./connections/socket"));
const { HTTP_SERVER_PORT, SERVER_TYPE } = module_1.default;
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield newLogger_1.Logger.initializeLogger();
        const [redisClient] = yield Promise.all([
            redis_1.default.init(),
            socket_1.default.createSocketServer(),
        ]);
        yield redlock_1.redlock.init(redisClient);
        http_1.default.listen(HTTP_SERVER_PORT, () => {
            newLogger_1.Logger.info(`${SERVER_TYPE} Server listening to the port ${HTTP_SERVER_PORT}`);
        });
        http_1.default.on('error', (e) => {
            newLogger_1.Logger.error('HTTP ERROR: ', e);
        });
    }
    catch (error) {
        newLogger_1.Logger.error(`Server listen error`, error);
    }
}))();
process
    .on('unhandledRejection', (error) => {
    newLogger_1.Logger.error(`Unhandled Rejection at Promise: ${error}, @ ${new Date().toLocaleString()} \n`);
})
    .on('uncaughtException', (error) => {
    newLogger_1.Logger.error(`Uncaught Exception thrown at ${new Date().toLocaleString()} \n`, error);
});
process.on('message', (packet) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    newLogger_1.Logger.info(`Received cleanup request`, packet);
    // Disconnection Handler
    if (((_a = packet === null || packet === void 0 ? void 0 : packet.data) === null || _a === void 0 ? void 0 : _a.reason) === 'deployment') {
        // cleanup here
    }
}));
