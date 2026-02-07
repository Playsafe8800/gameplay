"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const authMe = __importStar(require("../utils/ackMid"));
const newLogger_1 = require("../newLogger");
const http_1 = __importDefault(require("./http"));
const zk_1 = __importDefault(require("./zk"));
const redis_1 = require("redis");
const constants_1 = require("../constants");
const os = __importStar(require("os"));
const socketOperation_1 = require("../socketHandler/socketOperation");
const constants_2 = require("../constants");
const userService_1 = __importDefault(require("../userService"));
class Socket {
    /**
     *
     * socket new connection callback
     */
    constructor() {
        this.grpcRequestsMap = {};
        /**
         *
         * creates socket server instance
         * called this function muliptle times will not create new instance if already created
         * @returns {SocketClient}
         */
        this.createSocketServer = () => __awaiter(this, void 0, void 0, function* () {
            if (!this.socketClient) {
                const socketConfig = {
                    pingInterval: constants_1.NUMERICAL.TEN_THOUSAND,
                    allowEIO3: true,
                };
                this.socketClient = new socket_io_1.Server(http_1.default, socketConfig);
                this.socketClient.adapter((0, redis_adapter_1.createAdapter)(this.pubClient, this.subClient, { key: `socketIo-${process.env.DEPLOYMENT_HASH}` }));
                this.socketClient.on(constants_1.SOCKET.CONNECTION, this.connectionCB);
            }
            return this.socketClient;
        });
        this.connectionCB = this.connectionCB.bind(this);
        const { PUBSUB_REDIS_HOST, PUBSUB_REDIS_PORT, PUBSUB_REDIS_PASSWORD, } = zk_1.default.getConfig();
        const params = Object.assign({ host: PUBSUB_REDIS_HOST, port: PUBSUB_REDIS_PORT }, (!!PUBSUB_REDIS_PASSWORD && {
            password: PUBSUB_REDIS_PASSWORD,
        }));
        this.pubClient = new redis_1.RedisClient(params);
        this.pubClient.on('ready', () => {
            newLogger_1.Logger.info('Publisher Redis Ready!');
        });
        this.subClient = this.pubClient.duplicate();
        this.subClient.on('ready', () => {
            newLogger_1.Logger.info('Subscriber Redis Ready!');
        });
        this.pubClient.on('error', (error) => {
            newLogger_1.Logger.error('pub Redis Client error : ', error);
        });
        this.subClient.on('error', (error) => {
            newLogger_1.Logger.error('sub Redis Client error : ', error);
        });
        // Logging ccu every 30 seconds
        setInterval(() => {
            if (this.socketClient) {
                newLogger_1.Logger.info(`CCU, ${this.socketClient.engine.clientsCount}, ${constants_1.DEPLOYMENT_CONSTANTS.SERVICE_NAME},${os.hostname()}`);
                const count = this.socketClient.sockets.sockets.size;
            }
        }, 5000);
    }
    connectionCB(client) {
        return __awaiter(this, void 0, void 0, function* () {
            const processStartTime = new Date().toISOString();
            // const cardGamesLib = await import('card-games-lib');
            const { token, AppType } = client.handshake.auth;
            newLogger_1.Logger.info(`${constants_1.MESSAGES.NEW_CONNECTION} socketId: ${client === null || client === void 0 ? void 0 : client.id}`, [
                `client.handshake.auth: `,
                client.handshake.auth,
                ` AppType: ${AppType}`,
                client.handshake
            ]);
            const grpcAuthRes = yield userService_1.default.userAuth(token);
            const userId = grpcAuthRes === null || grpcAuthRes === void 0 ? void 0 : grpcAuthRes.id;
            if (userId) {
                client.userId = userId; // we will access userId from socketObject only
                newLogger_1.Logger.info(`User ${userId} is authenticated .. socketId: ${client === null || client === void 0 ? void 0 : client.id}`);
            }
            else {
                newLogger_1.Logger.info(`User ${userId} is not authenticated .. socketId: ${client === null || client === void 0 ? void 0 : client.id}`);
                client.disconnect();
                return;
            }
            client.data.token = token;
            client.data.AppType = AppType;
            client.use(authMe.metricsOnMid(client));
            const requestHandler = (yield Promise.resolve().then(() => __importStar(require('../socketHandler')))).default;
            newLogger_1.Logger.info(constants_1.MESSAGES.NEW_CONNECTION, client.id);
            const processEndTime = new Date().toISOString();
            yield socketOperation_1.socketOperation.sendEventToClient(client, { processStartTime, processEndTime }, constants_2.EVENTS.CONNECTION_SUCCESS);
            client.use(requestHandler.bind(client));
            // client.conn is default menthod for ping pong request
            client.conn.on(constants_1.SOCKET.PACKET, (packet) => __awaiter(this, void 0, void 0, function* () {
                if (packet.type === 'ping') {
                    newLogger_1.Logger.info('Ping received......');
                }
            }));
            /**
             * error event handler
             */
            client.on(constants_1.SOCKET.ERROR, (error) => __awaiter(this, void 0, void 0, function* () { return newLogger_1.Logger.error('client error......,', error); }));
            client.on(constants_1.SOCKET.DISCONNECT, (disc) => __awaiter(this, void 0, void 0, function* () {
                newLogger_1.Logger.info('ping: disconnect-->disc: ', disc, 'socket: ', client.id, `eventMetaData: `, client.eventMetaData);
                this.DisconnectHandler(client);
            }));
        });
    }
    DisconnectHandler(client) {
        return __awaiter(this, void 0, void 0, function* () {
            const { handleDisconnect } = yield Promise.resolve().then(() => __importStar(require('../socketHandler/handleDisconnect')));
            yield handleDisconnect(client);
        });
    }
}
const socket = new Socket();
exports.default = socket;
