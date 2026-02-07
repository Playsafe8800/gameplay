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
const socketOperation_1 = require("../../socketHandler/socketOperation");
const constants_1 = require("../../constants");
const newLogger_1 = require("../../newLogger");
class EmoJi {
    send(userId, tableId, emojiId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!tableId || !userId || typeof emojiId === 'undefined') {
                    throw new Error(`data missing on emoji send ${userId}|${tableId}|${emojiId}`);
                }
                yield socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.SET_EMOJI, {
                    userId,
                    emojiId,
                    tableId,
                });
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error found on emoji send ${userId}|${tableId}|${emojiId},
        error: ${error.message}`, [error]);
            }
        });
    }
}
module.exports = new EmoJi();
