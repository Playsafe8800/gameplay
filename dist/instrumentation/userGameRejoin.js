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
exports.userGameRejoin = void 0;
const newLogger_1 = require("../newLogger");
const baseTable_1 = require("./baseTable");
function userGameRejoin(res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { tableData, tableGamePlay, userId, isRejoin, reason } = res;
            const tableObject = (0, baseTable_1.baseTable)(tableData, tableGamePlay, userId);
            tableObject['Is Success'] = isRejoin;
            tableObject['Fail Reason'] = reason;
            // const sendEventData = {
            //   key: INSTRUMENTATION_EVENTS.USER_GAME_REJOINED,
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
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR userGameRejoin res: `, [res, error.message, error]);
            return false;
        }
    });
}
exports.userGameRejoin = userGameRejoin;
