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
exports.genericSetOperation = exports.genericGetOperation = void 0;
const newLogger_1 = require("../newLogger");
const errors_1 = require("../constants/errors");
const index_1 = require("../utils/errors/index");
const index_2 = require("./redisWrapper/index");
function genericGetOperation(tableId, keyPrefix, args) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const prefixedArgs = args.map((arg) => `${keyPrefix}:${arg}`);
            const result = yield (0, index_2.getValuesFromHash)(tableId, prefixedArgs);
            const genericRes = {};
            args.forEach((arg, index) => {
                genericRes[arg] = result[index];
            });
            return genericRes;
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error occurred in ${error.message} ${error}`);
            throw new index_1.CancelBattleError(error.message, errors_1.ERROR_CAUSES.VALIDATION_ERROR);
        }
    });
}
exports.genericGetOperation = genericGetOperation;
function genericSetOperation(tableId, keyPrefix, data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const hashKeysObj = {};
            for (const key in data) {
                hashKeysObj[`${keyPrefix}:${key}`] = data[key];
            }
            yield (0, index_2.saveValuesInHash)(tableId, hashKeysObj);
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error occurred in ${error.message} ${error}`);
            throw new index_1.CancelBattleError(error.message, errors_1.ERROR_CAUSES.VALIDATION_ERROR);
        }
    });
}
exports.genericSetOperation = genericSetOperation;
