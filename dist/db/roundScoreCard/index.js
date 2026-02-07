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
exports.roundScoreCardService = void 0;
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const redisWrapper_1 = require("../redisWrapper");
class RoundScoreCard {
    constructor() {
        this.getRoundScoreCard = this.getRoundScoreCard.bind(this);
        this.setRoundScoreCard = this.setRoundScoreCard.bind(this);
    }
    getRoundScoreCardKey(tableId) {
        return `${(0, utils_1.getIdPrefix)()}:${constants_1.TABLE_PREFIX.ROUND_SCORE_CARD}:${tableId}`;
    }
    getRoundScoreCard(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getRoundScoreCardKey(tableId);
            const roundScoreCardData = yield (0, redisWrapper_1.getValueFromKey)(key);
            return roundScoreCardData;
        });
    }
    setRoundScoreCard(tableId, lastRoundScoreCardData) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getRoundScoreCardKey(tableId);
            yield (0, redisWrapper_1.setValueInKeyWithExpiry)(key, lastRoundScoreCardData);
        });
    }
}
exports.roundScoreCardService = new RoundScoreCard();
