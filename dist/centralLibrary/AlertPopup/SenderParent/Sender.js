"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sender = void 0;
const utils_1 = require("../../auth-me/utils");
const newLogger_1 = require("../../../newLogger");
const connections_1 = require("../../../connections");
class Sender {
    sendEvent(eventName, socket, data, logObj) {
        try {
            data = Object.assign({ tableId: logObj.tableId }, data);
            data = { en: eventName, data };
            if (typeof socket !== 'string')
                socket.emit(eventName, (0, utils_1.metricsEmitMid)(data, (logObj === null || logObj === void 0 ? void 0 : logObj.userId) || '', true), (data) => {
                    const ackResponse = JSON.parse(data);
                    ackResponse.metrics.srct = `${new Date().getTime()}`;
                    newLogger_1.Logger.info(`Acknowledgement received from client for ${eventName} event and it's metrices are : `, [ackResponse.metrics]);
                });
            else
                connections_1.socket.socketClient
                    .to(socket)
                    .emit(eventName, (0, utils_1.metricsEmitMid)(data, logObj.userId || ''));
            newLogger_1.Logger.info(`SEND POPUP TO CLIENT: ${(logObj === null || logObj === void 0 ? void 0 : logObj.tableId) || ''}  user: ${(logObj === null || logObj === void 0 ? void 0 : logObj.userId) || ''}, ${logObj.error} : ${logObj.reason}`, [data]);
        }
        catch (error) {
            newLogger_1.Logger.error(`CATCH_ERROR: SendPopup Event`, data, error);
        }
    }
}
exports.Sender = Sender;
