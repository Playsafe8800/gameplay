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
exports.turnHistoryService = void 0;
const constants_1 = require("../../constants");
const numerical_1 = require("../../constants/numerical");
const utils_1 = require("../../utils");
const index_1 = require("../redisWrapper/index");
class TurnHistory {
    getTurnHistoryKey(tableId, roundNumber) {
        return `${(0, utils_1.getIdPrefix)()}:${constants_1.TABLE_PREFIX.TURN_HISTORY}:${tableId}:${roundNumber}`;
    }
    getTurnHistory(tableId, roundNumber = numerical_1.NUMERICAL.ONE) {
        return __awaiter(this, void 0, void 0, function* () {
            const turnHistoryKey = this.getTurnHistoryKey(tableId, roundNumber);
            const turnHistoryData = yield (0, index_1.getValueFromKey)(turnHistoryKey);
            return turnHistoryData;
        });
    }
    setTurnHistory(tableId, roundNumber = numerical_1.NUMERICAL.ONE, turnHistoryData) {
        return __awaiter(this, void 0, void 0, function* () {
            const turnHistoryKey = this.getTurnHistoryKey(tableId, roundNumber);
            yield (0, index_1.setValueInKeyWithExpiry)(turnHistoryKey, turnHistoryData);
        });
    }
    setGameTurnHistory(tableId, turnHistoryData) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, index_1.setValueInKeyWithExpiry)(`HISTORY:${tableId}`, turnHistoryData, 1800);
        });
    }
    getDefaultTurnHistoryData(tableData, tableGameData) {
        return {
            history: [
                this.getDefaultCurrentRoundTurnHistoryData(tableData, tableGameData),
            ],
        };
    }
    getDefaultCurrentRoundTurnHistoryData(tableData, tableGameData) {
        const currentTime = new Date().toISOString();
        return {
            roundNo: tableData.currentRound,
            roundId: tableGameData._id,
            winnerId: -1,
            createdOn: currentTime,
            modifiedOn: currentTime,
            extra_info: tableGameData.trumpCard,
            turnsDetails: [],
        };
    }
}
exports.turnHistoryService = new TurnHistory();
