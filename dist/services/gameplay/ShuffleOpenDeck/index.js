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
exports.shuffleOpenDeck = void 0;
const centralLibrary_1 = require("../../../centralLibrary");
const newLogger_1 = require("../../../newLogger");
const suffleCard_1 = require("../../../utils/suffleCard");
const socketOperation_1 = require("../../../socketHandler/socketOperation");
const constants_1 = require("../../../constants");
function shuffleOpenDeck({ tableGamePlayData, tableId, currentRound, }) {
    return __awaiter(this, void 0, void 0, function* () {
        newLogger_1.Logger.info(`closed deck is shuffled.. for ${tableId}`, [
            tableGamePlayData,
        ]);
        setTopToast('', tableId);
        socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.CLOSED_DECK_SUFFLE_SOCKET_EVENT);
        const lastCardOpendeck = tableGamePlayData.opendDeck.pop() || '';
        tableGamePlayData.closedDeck = (0, suffleCard_1.shuffleCards)(tableGamePlayData.opendDeck);
        tableGamePlayData.opendDeck = [lastCardOpendeck];
    });
}
exports.shuffleOpenDeck = shuffleOpenDeck;
function setTopToast(content, tableId) {
    centralLibrary_1.toast.TopToastPopup(tableId, {
        content,
    }, {
        apkVersion: 0,
        tableId,
        userId: `${0}`,
    });
}
