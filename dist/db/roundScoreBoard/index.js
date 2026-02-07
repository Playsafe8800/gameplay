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
exports.roundScoreBoardService = void 0;
const connections_1 = require("../../connections");
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const redisWrapper_1 = require("../redisWrapper");
class RoundScoreBoard {
    constructor() {
        this.getRoundScoreBoard = this.getRoundScoreBoard.bind(this);
        this.setRoundScoreBoard = this.setRoundScoreBoard.bind(this);
    }
    getRoundScoreBoardKey(tableId, roundNo) {
        return `${(0, utils_1.getIdPrefix)()}:${constants_1.TABLE_PREFIX.ROUND_SCORE_BOARD}:${tableId}:${roundNo}`;
    }
    getRoundScoreBoard(tableId, roundNo = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getRoundScoreBoardKey(tableId, roundNo);
            const roundScoreBoardData = yield (0, redisWrapper_1.getValueFromKey)(key);
            return roundScoreBoardData;
        });
    }
    setRoundScoreBoard(tableId, roundNo, lastRoundScoreBoardData) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getRoundScoreBoardKey(tableId, roundNo);
            yield (0, redisWrapper_1.setValueInKeyWithExpiry)(key, lastRoundScoreBoardData, ((_a = connections_1.zk.getConfig()) === null || _a === void 0 ? void 0 : _a.REDIS_DEFAULT_EXPIRY) * 2);
        });
    }
    deleteRoundScoreBoard(tableId, roundNo) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getRoundScoreBoardKey(tableId, roundNo);
            yield (0, redisWrapper_1.deleteKey)(key);
        });
    }
}
exports.roundScoreBoardService = new RoundScoreBoard();
