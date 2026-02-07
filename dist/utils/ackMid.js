"use strict";
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
exports.metricsOnMid = exports.metricsEmitMid = exports.ackMid = void 0;
const newLogger_1 = require("../newLogger");
function ackMid(_a, metrics, userId, tableId, ack, serverReceiveTime, eventName) {
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
        if (eventName !== 'HEART_BEAT')
            newLogger_1.Logger.info('RESPONSE SENT ', response);
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR CATCH_ERROR: Error while sending Acknowledgement ${error}`, [error]);
        throw new Error(error);
    }
}
exports.ackMid = ackMid;
function metricsEmitMid(response, userId, ackRequired, tableId, serverReceiveTime) {
    try {
        response =
            typeof response === 'string' ? JSON.parse(response) : response;
        const metrics = {
            uuid: Date.now().toString(),
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
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR CATCH_ERROR metricsOnMid: ${error}`, [error]);
        }
    };
}
exports.metricsOnMid = metricsOnMid;
