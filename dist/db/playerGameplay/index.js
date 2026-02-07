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
exports.playerGameplayService = void 0;
const constants_1 = require("../../constants");
const cardHandler_1 = require("../../services/gameplay/cardHandler");
const redisWrapper_1 = require("../redisWrapper");
const __1 = require("..");
class PlayerGameplay {
    constructor() {
        this.getPlayerGameplay = this.getPlayerGameplay.bind(this);
        this.setPlayerGameplay = this.setPlayerGameplay.bind(this);
        this.updateCardsByRoundId = this.updateCardsByRoundId.bind(this);
    }
    getPlayerGameplayKey(userId, currentRound) {
        return `${constants_1.TABLE_PREFIX.PLAYER_GAME_PLAY}:${userId}:${currentRound}`;
    }
    deletePlayerGamePlay(userId, tableId, currentRound) {
        return __awaiter(this, void 0, void 0, function* () {
            let deletekeys = [];
            const getAll = yield (0, redisWrapper_1.getAllHash)(tableId);
            for (const key in getAll) {
                if (key.includes(`${this.getPlayerGameplayKey(userId, currentRound)}:`))
                    deletekeys.push(key);
            }
            yield (0, redisWrapper_1.deleteValueInHash)(tableId, ...deletekeys);
        });
    }
    getPlayerGameplay(userId, tableId, currentRound, args) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, __1.genericGetOperation)(tableId, this.getPlayerGameplayKey(userId, currentRound), args);
        });
    }
    setPlayerGameplay(userId, tableId, currentRound, pgpData) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, __1.genericSetOperation)(tableId, this.getPlayerGameplayKey(userId, currentRound), pgpData);
        });
    }
    getDefaultPlayerGameplayData(userId, seatIndex, dealPoint, doesRebuy, networkParams, tableSessionId) {
        return {
            userId,
            currentCards: [],
            groupingCards: [],
            meld: [],
            lastPickCard: '',
            pickCount: 0,
            points: 0,
            rank: 0,
            seatIndex,
            userStatus: constants_1.PLAYER_STATE.PLAYING,
            dealPoint: dealPoint,
            invalidDeclare: false,
            isFirstTurn: true,
            split: 2,
            isAutoDrop: false,
            isAutoDropSwitch: false,
            turnCount: 0,
            timeoutCount: 0,
            useRebuy: doesRebuy,
            networkParams: networkParams,
            winningCash: 0,
            isPlayAgain: true,
            tableSessionId,
            isBotWinner: false,
            rejectedCards: [],
            pickedCards: [],
        };
    }
    updateCardsByRoundId(seats, usersCards, tableId, currentRound, wildCard, maximumPoints) {
        return __awaiter(this, void 0, void 0, function* () {
            const playersGamePromise = seats.map((seat) => this.getPlayerGameplay(seat._id, tableId, currentRound, [
                'userId',
                'currentCards',
                'groupingCards',
            ]));
            const playersGameData = yield Promise.all(playersGamePromise);
            const updatedPGPs = playersGameData.map((playerGameData, i) => {
                if (playerGameData) {
                    const grouping = cardHandler_1.cardHandler.initialCardsGrouping(usersCards[i]);
                    const { meld } = cardHandler_1.cardHandler.groupCardsOnMeld(grouping, wildCard, maximumPoints);
                    return Object.assign(Object.assign({}, playerGameData), { currentCards: usersCards[i], groupingCards: grouping, meld });
                }
                else {
                    return null;
                }
            });
            const cachePromiseList = updatedPGPs.map((newPlayerGameData, i) => {
                if (newPlayerGameData) {
                    return this.setPlayerGameplay(seats[i]._id, tableId, currentRound, newPlayerGameData);
                }
            });
            yield Promise.all(cachePromiseList);
            return updatedPGPs;
        });
    }
}
exports.playerGameplayService = new PlayerGameplay();
