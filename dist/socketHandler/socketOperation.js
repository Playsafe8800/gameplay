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
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketOperation = void 0;
const newLogger_1 = require("../newLogger");
const authMe = __importStar(require("../utils/ackMid"));
const connections_1 = require("../connections");
const constants_1 = require("../constants");
class SocketOperation {
    sendEventToClient(socket, data, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // send event f
                const responseObj = {
                    en: event,
                    data,
                };
                if (typeof socket !== 'string')
                    socket.emit(event, authMe.metricsEmitMid(responseObj, '', true), (res) => {
                        newLogger_1.Logger.info(`Client ack received for event: ${data.en}  res: `, [res]);
                    });
                else
                    connections_1.socket.socketClient.to(socket).emit(event, authMe.metricsEmitMid(responseObj, ''));
                newLogger_1.Logger.info(`SEND_EVENT TO CLIENT for table: ${data === null || data === void 0 ? void 0 : data.tableId} socket: ${typeof socket === 'string' ? socket : socket === null || socket === void 0 ? void 0 : socket.id}`, responseObj);
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR sendEventToClient:, ${error.message}`, [error]);
            }
        });
    }
    sendEventToRoom(roomId, event, data = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const responseObj = {
                    en: event,
                    data,
                };
                connections_1.socket.socketClient
                    .to(roomId)
                    .emit(event, authMe.metricsEmitMid(responseObj));
                newLogger_1.Logger.info(`SEND_EVENT TO ROOM for table: ${roomId}`, [
                    responseObj,
                ]);
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR sendEventToRoom: ${roomId}`, [data, error]);
            }
        });
    }
    addClientInRoom(socket, roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('Socket Joined to room >>>', [roomId]);
                return socket.join(roomId);
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR addClientInRoom: ${roomId}, ${error.message}`);
                return undefined;
            }
        });
    }
    sendEventToPlayingPlayersOnly(socket, data, event, playerGamePlayData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if ((playerGamePlayData === null || playerGamePlayData === void 0 ? void 0 : playerGamePlayData.userStatus) === constants_1.PLAYER_STATE.LEFT) {
                    newLogger_1.Logger.info(`${event} Trapped for user: ${playerGamePlayData.userId} because user Left the table`);
                    return;
                }
                this.sendEventToClient(socket, data, event);
            }
            catch (err) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR sendEventToPlayingPlayersOnly`, [err]);
            }
        });
    }
    removeClientFromRoom(roomId, socketId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('removeClientFromRoom', [roomId, socketId]);
                const socket = connections_1.socket.socketClient.sockets.sockets.get(socketId);
                return socket ? socket.leave(roomId) : '';
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR removeClientFromRoom: ${roomId}, ${error.message}`);
            }
        });
    }
    getSocketFromSocketId(socketId) {
        return __awaiter(this, void 0, void 0, function* () {
            // return socketConn.socketClient.sockets.sockets.get(socketId);
            const [socket] = yield connections_1.socket.socketClient
                .in(socketId)
                .fetchSockets();
            return socket;
        });
    }
}
exports.socketOperation = new SocketOperation();
