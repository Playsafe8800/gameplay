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
exports.userTableExited = void 0;
const newLogger_1 = require("../newLogger");
const constants_1 = require("../constants");
const baseTable_1 = require("./baseTable");
function userTableExited(res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { tableData, tableGamePlay, userId, isGameStarted } = res;
            const tableObject = (0, baseTable_1.baseTable)(tableData, tableGamePlay, userId);
            let { tableCurrentTimer } = tableGamePlay;
            tableCurrentTimer = tableCurrentTimer || new Date();
            const currentDate = new Date();
            const diffInSec = Math.ceil((new Date(tableCurrentTimer).valueOf() -
                new Date(currentDate).valueOf()) /
                1000);
            const hasGameStated = tableGamePlay.tableState !== constants_1.TABLE_STATE.ROUND_TIMER_STARTED;
            tableObject['Time Left'] =
                diffInSec > 3 && !hasGameStated ? diffInSec : 'N/A';
            tableObject.isGameStarted = isGameStarted;
            if (tableGamePlay.tableState === constants_1.TABLE_STATE.WAITING_FOR_PLAYERS)
                tableObject['Time Left'] = 15;
            // const sendEventData = {
            //   key: INSTRUMENTATION_EVENTS.USER_TABLE_EXITED,
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
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR userTableExited res: `, [res, error.message]);
            return false;
        }
    });
}
exports.userTableExited = userTableExited;
