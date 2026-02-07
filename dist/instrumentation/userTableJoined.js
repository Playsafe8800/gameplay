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
exports.userTableJoined = void 0;
const newLogger_1 = require("../newLogger");
const baseTable_1 = require("./baseTable");
function userTableJoined(res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            newLogger_1.Logger.debug('table join event.......');
            const { tableData, tableGamePlay, userId, isJoined, reason, isTopUp = false, } = res;
            const tableObject = (0, baseTable_1.baseTable)(tableData, tableGamePlay, userId);
            tableObject['Is Success'] = isJoined;
            tableObject['Fail Reason'] = reason;
            tableObject['Is Top Up'] = isTopUp;
            // const sendEventData = {
            //   key: INSTRUMENTATION_EVENTS.USER_TABLE_JOINED,
            //   timestamp: new Date().getTime(),
            //   payload: tableObject,
            // };
            // await grpcInstrumentation.sendInstrumentation(
            //   sendEventData,
            //   tableData.gameType,
            //   tableData.cgsClusterName,
            // );
            return tableObject;
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR userPlayedGame res: `, [res, error.message]);
            return false;
        }
    });
}
exports.userTableJoined = userTableJoined;
