"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomUUID = void 0;
const index_1 = require("./index");
const index_2 = require("../constants/index");
/**
 *
 * @returns
 */
function getRandomUUID(gameType = index_2.RUMMY_TYPES.POOL) {
    const str = `${(0, index_1.getIdPrefix)(gameType)}-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx-${new Date().getTime()}`;
    return str.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.getRandomUUID = getRandomUUID;
