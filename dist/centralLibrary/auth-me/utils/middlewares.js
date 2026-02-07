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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ackMid = exports.metricsEmitMid = exports.metricsOnMid = exports.authValidationMid = void 0;
const helpers_1 = require("../helpers");
const grpc_1 = require("../grpc");
const newLogger_1 = require("../../../newLogger");
/**
 *
 * @param client
 * @returns a middleware for socket
 */
function authValidationMid(client) {
    return (socket, next) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { token } = socket.handshake.Auth;
            const grpcAuthRes = yield (0, grpc_1.authenticateGameCardServer)({
                userAuthToken: token,
            });
            if (!(grpcAuthRes &&
                grpcAuthRes.isAuthentic &&
                grpcAuthRes.userId)) {
                newLogger_1.Logger.info(`User ${grpcAuthRes.userId} not is authenticated ..`);
                client.disconnect();
            }
            socket.userId = grpcAuthRes.userId;
            next();
        }
        catch (error) {
            client.disconnect();
        }
    });
}
exports.authValidationMid = authValidationMid;
/**
 *
 * @param client
 * @returns a Middleware function
 * Check and update the metrics for the client
 */
function metricsOnMid(client) {
    return (socket, next) => {
        try {
            if (socket[1] && socket[0]) {
                const [eventName, request] = socket;
                let clientInput = typeof request === 'string' ? JSON.parse(request) : request;
                if (clientInput.metrics) {
                    clientInput.metrics.srct = `${new Date().getTime()}`;
                    clientInput.metrics.userId = socket.userId;
                    clientInput = JSON.stringify(clientInput);
                    socket[1] = clientInput;
                    next();
                }
                else {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR METRICS_MISSING for event: ${eventName} for user ${socket.userId}`);
                }
            }
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR CATCH_ERROR: ${error}`);
        }
    };
}
exports.metricsOnMid = metricsOnMid;
/**
 *
 * @param response the payload to send
 * @optional @param userId userId
 * @optional @param ackRequired in case of broadcasting can be avoided
 * @optional @param tableId User table Id if available
 * @returns payload with metrics binded
 */
function metricsEmitMid(response, userId, ackRequired, tableId, serverReceiveTime) {
    try {
        response =
            typeof response === 'string' ? JSON.parse(response) : response;
        const metrics = {
            uuid: (0, helpers_1.getRandomUUID)(),
            ctst: '',
            srct: serverReceiveTime || '',
            srpt: `${new Date().getTime()}`,
            crst: '',
            userId: userId || '',
            apkVersion: '',
            tableId: tableId || '',
        };
        Object.assign(response, { metrics, ackRequired: !!ackRequired });
        const res = { data: JSON.stringify(response) };
        const eventName = response.en;
        newLogger_1.Logger.debug(`SETTING METRICS FOR ${eventName} EVENT TO ${userId} : `, res);
        return res;
    }
    catch (error) {
        throw new Error(error);
    }
}
exports.metricsEmitMid = metricsEmitMid;
/**
 *
 * Sends Socket event's acknowledgement to client
 * @param { AcknowledgeInput } param0
 * @param { Metrics } metrics
 * @param userId
 * @param tableId
 * @param ack
 *
 */
function ackMid(_a, metrics, userId, tableId, ack, serverReceiveTime) {
    var { success, error } = _a, data = __rest(_a, ["success", "error"]);
    try {
        metrics.srct = serverReceiveTime;
        metrics.srpt = `${new Date().getTime()}`;
        metrics.tableId = tableId;
        const response = {
            success,
            error,
            data,
            metrics,
            userId,
            tableId,
        };
        ack(JSON.stringify(response));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR CATCH_ERROR: Error while sending Acknowledgement `, [error]);
        throw new Error(error);
    }
}
exports.ackMid = ackMid;
