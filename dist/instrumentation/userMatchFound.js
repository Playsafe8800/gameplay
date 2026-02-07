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
exports.userMatchFound = void 0;
const newLogger_1 = require("../newLogger");
const baseTable_1 = require("./baseTable");
function userMatchFound(tableData, tableGameplayData, userId, userAppData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tableObject = (0, baseTable_1.baseTable)(tableData, tableGameplayData, userId);
            // tableObject['MM Service'] = MMSERVICE.CGS;
            // tableObject['MM Type'] = MMTYPE.FIFO;
            if (userAppData) {
                (0, baseTable_1.baseAppData)(userAppData, tableObject);
            }
            // const sendEventData = {
            //   key: INSTRUMENTATION_EVENTS.USER_MATCH_FOUND,
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
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR userMatchFound res: `, [
                tableData,
                userAppData,
                error.message,
                error,
            ]);
            return false;
        }
    });
}
exports.userMatchFound = userMatchFound;
