"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomUUID = void 0;
function getRandomUUID() {
    const str = `RUM-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx-${new Date().getTime()}`;
    return str.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.getRandomUUID = getRandomUUID;
