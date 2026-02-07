"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deductRake = void 0;
function deductRake(amount, rake) {
    const remainingPercent = (100 - rake) / 100;
    return amount * remainingPercent;
}
exports.deductRake = deductRake;
