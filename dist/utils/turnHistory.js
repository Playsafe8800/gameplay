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
exports.sortedCards = exports.formatCards = exports.replaceRoundHistory = exports.UpdateTurnDetails = exports.getCurrentRoundHistory = void 0;
const underscore_1 = __importDefault(require("underscore"));
const objectModels_1 = require("../objectModels");
const turnHistory_1 = require("../db/turnHistory");
function getCurrentRoundHistory(history, currentRound) {
    return history.history.filter((e) => e.roundNo === currentRound)[0];
}
exports.getCurrentRoundHistory = getCurrentRoundHistory;
function UpdateTurnDetails(tableId, currentRound, currentTurnData) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentRoundHistory = yield turnHistory_1.turnHistoryService.getTurnHistory(tableId, currentRound);
        let latestTurnDetails = currentRoundHistory.turnsDetails.pop();
        if (!latestTurnDetails) {
            throw Error('Previous Turn Data not available to update');
        }
        latestTurnDetails = Object.assign(Object.assign({}, latestTurnDetails), currentTurnData);
        currentRoundHistory.turnsDetails.push(latestTurnDetails);
        turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory);
    });
}
exports.UpdateTurnDetails = UpdateTurnDetails;
function replaceRoundHistory(history, currentRound, updatedObj) {
    const newHistory = history;
    const foundIndex = history.history.findIndex((e) => e.roundNo === currentRound);
    newHistory.history[foundIndex] = updatedObj;
    return newHistory;
}
exports.replaceRoundHistory = replaceRoundHistory;
function formatCards(groupingCards) {
    let res = [];
    if (groupingCards.pure && groupingCards.pure.length) {
        res.push(groupingCards.pure);
    }
    if (groupingCards.seq && groupingCards.seq.length) {
        res.push(groupingCards.seq);
    }
    if (groupingCards.set && groupingCards.set.length) {
        res.push(groupingCards.set);
    }
    if (groupingCards.dwd && groupingCards.dwd.length) {
        res.push(groupingCards.dwd);
    }
    if (res.length) {
        res = underscore_1.default.flatten(res).join(',');
    }
    return res;
}
exports.formatCards = formatCards;
function sortedCards(cards, meld) {
    const finalMap = {
        pure: [],
        seq: [],
        set: [],
        dwd: [],
    };
    cards.forEach((currentCards, index) => {
        const currentMeld = meld[index];
        if (currentMeld === objectModels_1.MELD.PURE) {
            finalMap.pure.push(currentCards);
        }
        else if (currentMeld === objectModels_1.MELD.SEQUENCE) {
            finalMap.seq.push(currentCards);
        }
        else if (currentMeld === objectModels_1.MELD.SET) {
            finalMap.set.push(currentCards);
        }
        else {
            finalMap.dwd.push(currentCards);
        }
    });
    return finalMap;
}
exports.sortedCards = sortedCards;
