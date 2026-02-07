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
exports.stateManagementService = void 0;
const utils_1 = require("../../utils");
const constants_1 = require("../../constants");
const index_1 = require("../redisWrapper/index");
class State {
    getStateManagementKeyTable(tableId) {
        return `${(0, utils_1.getIdPrefix)()}:${constants_1.TABLE_PREFIX.STATE}:${tableId}`;
    }
    getStateManagementKeyUser(tableId, userId) {
        return `${(0, utils_1.getIdPrefix)()}:${constants_1.TABLE_PREFIX.STATE}:${tableId}:${userId}`;
    }
    getStateTable(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stateKey = this.getStateManagementKeyTable(tableId);
            const stateData = yield (0, index_1.getValueFromKey)(stateKey);
            return stateData;
        });
    }
    getStateUser(tableId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stateKey = this.getStateManagementKeyUser(tableId, userId);
            const stateData = yield (0, index_1.getValueFromKey)(stateKey);
            return stateData;
        });
    }
    setStateTable(tableId, stateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getStateManagementKeyTable(tableId);
            yield (0, index_1.setValueInKeyWithExpiry)(key, stateData);
        });
    }
    setStateUser(tableId, userId, stateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getStateManagementKeyUser(tableId, userId);
            yield (0, index_1.setValueInKeyWithExpiry)(key, stateData);
        });
    }
}
exports.stateManagementService = new State();
