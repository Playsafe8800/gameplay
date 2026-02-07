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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllHash = exports.setHashExpiry = exports.deleteHash = exports.deleteValueInHash = exports.saveValuesInHash = exports.getValuesFromHash = exports.getAndRemoveOldestSet = exports.getTopValueFromSortedSet = exports.removeValueFromSet = exports.removeValueFromSortedSet = exports.addValueInSortedSet = exports.pexpire = exports.popFromQueue = exports.pushIntoQueue = exports.deleteKey = exports.getValueFromKey = exports.setValueInKeyWithExpiry = exports.setValueInKey = void 0;
const commands_1 = __importDefault(require("./commands"));
const constants_1 = require("../../constants");
const constants_2 = require("../../constants");
const connections_1 = require("../../connections");
const index_1 = require("../../utils/index");
const { REDIS_DEFAULT_EXPIRY } = connections_1.zk.getConfig();
/* Keys queries */
const setValueInKey = (key, obj) => __awaiter(void 0, void 0, void 0, function* () { return commands_1.default.keyCommands.set(key, JSON.stringify(obj)); });
exports.setValueInKey = setValueInKey;
const setValueInKeyWithExpiry = (key, obj, exp = REDIS_DEFAULT_EXPIRY || constants_2.CONFIG.REDIS_DEFAULT_EXPIRY) => __awaiter(void 0, void 0, void 0, function* () {
    return commands_1.default.keyCommands.setex(key, exp, JSON.stringify(obj));
});
exports.setValueInKeyWithExpiry = setValueInKeyWithExpiry;
const getValueFromKey = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const valueStr = yield commands_1.default.keyCommands.get(key);
    return valueStr ? JSON.parse(valueStr) : null;
});
exports.getValueFromKey = getValueFromKey;
const deleteKey = (key) => __awaiter(void 0, void 0, void 0, function* () { return commands_1.default.keyCommands.del(key); });
exports.deleteKey = deleteKey;
const pushIntoQueue = (key, element) => __awaiter(void 0, void 0, void 0, function* () {
    return commands_1.default.queueCommands.push(`${constants_1.REDIS_CONSTANTS.QUEUE}:${key}`, JSON.stringify(element));
});
exports.pushIntoQueue = pushIntoQueue;
const popFromQueue = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const resStr = yield commands_1.default.queueCommands.pop(`${constants_1.REDIS_CONSTANTS.QUEUE}:${key}`);
    return JSON.parse(resStr);
});
exports.popFromQueue = popFromQueue;
const pexpire = (key, value) => __awaiter(void 0, void 0, void 0, function* () { return commands_1.default.keyCommands.pexpire(key, value); });
exports.pexpire = pexpire;
const addValueInSortedSet = (key, score, value) => __awaiter(void 0, void 0, void 0, function* () { return commands_1.default.sortedSetCommands.add(key, score, value); });
exports.addValueInSortedSet = addValueInSortedSet;
const removeValueFromSortedSet = (key, value) => __awaiter(void 0, void 0, void 0, function* () { return commands_1.default.sortedSetCommands.rem(key, value); });
exports.removeValueFromSortedSet = removeValueFromSortedSet;
const removeValueFromSet = (key, value) => __awaiter(void 0, void 0, void 0, function* () { return commands_1.default.setCommands.rem(key, JSON.stringify(value)); });
exports.removeValueFromSet = removeValueFromSet;
const getTopValueFromSortedSet = (key) => __awaiter(void 0, void 0, void 0, function* () { return commands_1.default.sortedSetCommands.peek(key, 0, 0); });
exports.getTopValueFromSortedSet = getTopValueFromSortedSet;
const getAndRemoveOldestSet = (key) => __awaiter(void 0, void 0, void 0, function* () { return commands_1.default.sortedSetCommands.zpopmin(key); });
exports.getAndRemoveOldestSet = getAndRemoveOldestSet;
const getValuesFromHash = (key, args) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield commands_1.default.hashCommand.hmget(key, ...args);
    if (result) {
        return result.map((value) => {
            if (value === "undefined")
                return undefined;
            try {
                return JSON.parse(value);
            }
            catch (_a) {
                return value;
            }
        });
    }
    return null;
});
exports.getValuesFromHash = getValuesFromHash;
const saveValuesInHash = (key, values) => __awaiter(void 0, void 0, void 0, function* () {
    values = (0, index_1.flattenObject)(values);
    const hashValue = Object.entries(values).flat();
    yield commands_1.default.hashCommand.hmset(key, ...hashValue);
});
exports.saveValuesInHash = saveValuesInHash;
const deleteValueInHash = (key, ...args) => __awaiter(void 0, void 0, void 0, function* () {
    return yield commands_1.default.hashCommand.hdel(key, ...args);
});
exports.deleteValueInHash = deleteValueInHash;
const deleteHash = (key) => __awaiter(void 0, void 0, void 0, function* () {
    return yield commands_1.default.hashCommand.hdel(key);
});
exports.deleteHash = deleteHash;
const setHashExpiry = (key) => __awaiter(void 0, void 0, void 0, function* () {
    return yield commands_1.default.hashCommand.expire(key, constants_2.CONFIG.REDIS_DEFAULT_EXPIRY);
});
exports.setHashExpiry = setHashExpiry;
const getAllHash = (key) => __awaiter(void 0, void 0, void 0, function* () {
    return yield commands_1.default.hashCommand.hgetall(key);
});
exports.getAllHash = getAllHash;
