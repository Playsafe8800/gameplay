"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateUtils = void 0;
const moment_1 = __importDefault(require("moment"));
class DateUtils {
    addEpochTimeInSeconds(timer) {
        const time = (0, moment_1.default)().add(timer, 's');
        return String(time.valueOf());
    }
    getCurrentEpochTime() {
        return String(new Date().valueOf());
    }
}
exports.dateUtils = new DateUtils();
