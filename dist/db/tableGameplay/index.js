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
exports.tableGameplayService = void 0;
const newLogger_1 = require("../../newLogger");
const constants_1 = require("../../constants");
const errors_1 = require("../../constants/errors");
const utils_1 = require("../../utils");
const index_1 = require("../../utils/errors/index");
const model_validator_1 = require("../../validators/model.validator");
const index_2 = require("../redisWrapper/index");
const __1 = require("..");
class TableGameplay {
    getTableGameplayKey(currentRound) {
        return `${constants_1.TABLE_PREFIX.TABLE_GAME_PLAY}:${currentRound}`;
    }
    getOpenDiscardedCardKey(tableId, currentRound) {
        return `${(0, utils_1.getIdPrefix)()}:${constants_1.TABLE_PREFIX.OPEN_DISCARDED_CARDS}:${tableId}:${currentRound}`;
    }
    getTableGameplay(tableId, currentRound, args) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, __1.genericGetOperation)(tableId, this.getTableGameplayKey(currentRound), args);
        });
    }
    setTableGameplay(tableId, currentRound, tableGameplayData) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, __1.genericSetOperation)(tableId, this.getTableGameplayKey(currentRound), tableGameplayData);
        });
    }
    deleteTableGameplay(tableId, currentRound) {
        return __awaiter(this, void 0, void 0, function* () {
            let deletekeys = [];
            const getAll = yield (0, index_2.getAllHash)(tableId);
            for (const key in getAll) {
                if (key.includes(`${this.getTableGameplayKey(currentRound)}:`))
                    deletekeys.push(key);
            }
            yield (0, index_2.deleteValueInHash)(tableId, ...deletekeys);
        });
    }
    getSplitRequestKey(tableId) {
        return `${(0, utils_1.getIdPrefix)()}:${constants_1.TABLE_PREFIX.SPLIT_REQUEST}:${tableId}`;
    }
    getSplitRequest(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getSplitRequestKey(tableId);
            return (0, index_2.getValueFromKey)(key);
        });
    }
    updateSplitRequest(tableId, updatedSplitData) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getSplitRequestKey(tableId);
            const splitData = yield this.getSplitRequest(key);
            if (!splitData) {
                return (0, index_2.setValueInKeyWithExpiry)(key, updatedSplitData, constants_1.NUMERICAL.FIFTEEN);
            }
            return (0, index_2.setValueInKeyWithExpiry)(key, Object.assign(Object.assign({}, splitData), updatedSplitData));
        });
    }
    deleteSplitRequest(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getSplitRequestKey(tableId);
            yield (0, index_2.deleteKey)(key);
        });
    }
    getOpenDiscardedCards(tableId, currentRound) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const key = this.getOpenDiscardedCardKey(tableId, currentRound);
                const OpenDiscardedCardsData = yield (0, index_2.getValueFromKey)(key);
                return OpenDiscardedCardsData;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error occurred in getOpenDiscardedCards ${error.message} ${error}`);
                return null;
            }
        });
    }
    setOpenDiscardedCards(tableId, currentRound, OpenDiscardedCardsData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                (0, model_validator_1.openDiscardedCardsValidator)(OpenDiscardedCardsData);
                const key = this.getOpenDiscardedCardKey(tableId, currentRound);
                yield (0, index_2.setValueInKeyWithExpiry)(key, OpenDiscardedCardsData);
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error occurred in setOpenDiscardedCards ${error.message} ${error}`);
                throw new index_1.CancelBattleError(error.message, errors_1.ERROR_CAUSES.VALIDATION_ERROR);
            }
        });
    }
}
exports.tableGameplayService = new TableGameplay();
