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
const axios_1 = __importDefault(require("axios"));
const newLogger_1 = require("../newLogger");
const errors_1 = require("../utils/errors");
const helper_1 = require("./helper");
axios_1.default.defaults.timeout = 10000;
const defaultToken = process.env.DEFAULT_USER_SERVICE_TOKEN;
class UserService {
    static retryRequest(requestFn, url, maxRetries = 5) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let lastError = null;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    return yield requestFn();
                }
                catch (error) {
                    const status = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status;
                    const isRetryableStatus = status >= 500;
                    const isNetworkError = [
                        'ECONNABORTED',
                        'ERR_NETWORK',
                        'ETIMEDOUT',
                        'ECONNRESET',
                        'ENOTFOUND',
                        'ECONNREFUSED',
                    ].includes(error.code);
                    lastError = new errors_1.InternalError(error.message, error);
                    if ((isRetryableStatus || isNetworkError) &&
                        attempt < maxRetries - 1) {
                        newLogger_1.Logger.info(`retryRequest `, [
                            attempt,
                            url,
                            `status: ${status}`,
                        ]);
                        yield new Promise((resolve) => setTimeout(resolve, 500));
                    }
                    else {
                        break;
                    }
                }
            }
            throw lastError;
        });
    }
    static drop(currentCards, wildCard, cohorts, openedCard, deckCount, tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { hand, jokerRank, topCard } = (0, helper_1.dropInputFormator)(currentCards, wildCard, openedCard);
                const handIds = hand.map((card) => card.id);
                const topCardId = topCard.id;
                newLogger_1.Logger.info('DropInputBotService:- ', [
                    tableId,
                    {
                        hand: handIds,
                        joker_rank: jokerRank,
                        cohorts,
                        deck_cnt: deckCount,
                    },
                ]);
                const url = `${this.botHost}${this.DROP}`;
                const userInfo = yield this.retryRequest(() => axios_1.default.post(url, {
                    hand: handIds,
                    joker_rank: jokerRank,
                    cohort_array: cohorts,
                    deck_cnt: deckCount,
                }), url);
                newLogger_1.Logger.info('DropOutputBotService: ', [tableId, userInfo.data]);
                return (0, helper_1.dropOutPutFormator)(userInfo.data, hand);
            }
            catch (e) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR_drop`, [e, tableId]);
                throw e;
            }
        });
    }
    static pick(currentCards, openedCard, wildCard, is_first_turn, tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { hand, topCard, jokerRank } = (0, helper_1.pickInputFormator)(currentCards, openedCard, wildCard);
                const handIds = hand.map((card) => card.id);
                const topCardId = topCard.id;
                newLogger_1.Logger.info('PickInputBotService:- ', [
                    tableId,
                    {
                        hand: handIds,
                        top_card_id: topCardId,
                        joker_rank: jokerRank,
                        is_first_turn: is_first_turn ? 1 : 0,
                    },
                ]);
                const url = `${this.botHost}${this.PICK}`;
                const userInfo = yield this.retryRequest(() => axios_1.default.post(url, {
                    hand: handIds,
                    top_card_id: topCardId,
                    joker_rank: jokerRank,
                    is_first_turn: is_first_turn ? 1 : 0,
                }), url);
                newLogger_1.Logger.info('PickOutputBotService:- ', [
                    tableId,
                    userInfo.data,
                ]);
                return userInfo.data['should_pick'];
            }
            catch (e) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR_pick`, [e, tableId]);
                throw e;
            }
        });
    }
    static throw(currentCards, wildCard, deckCount, opendDeck, tableId, rejCards, pickCards) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info('RawThrowInputBotService:- ', [
                    tableId,
                    {
                        currentCards,
                        wildCard,
                        deckCount,
                        opendDeck,
                        rejCards,
                        pickCards,
                    },
                ]);
                const { hand, jokerRank, p_array, rejectedCards, pickedCards } = (0, helper_1.throwInputFormator)(currentCards, wildCard, opendDeck, rejCards, pickCards);
                const handIds = hand.map((c) => c.id);
                const pArrayIds = p_array.map((c) => c.id);
                const rejectedCardIds = rejectedCards === null || rejectedCards === void 0 ? void 0 : rejectedCards.map((c) => c.id);
                const pickedCardIds = pickedCards === null || pickedCards === void 0 ? void 0 : pickedCards.map((c) => c.id);
                newLogger_1.Logger.info('ThrowInputBotService:- ', [
                    tableId,
                    {
                        hand: handIds,
                        joker_rank: jokerRank,
                        deck_cnt: deckCount,
                        p_array: pArrayIds,
                        rejectedCards: rejectedCardIds,
                        pickedCards: pickedCardIds,
                    },
                ]);
                const sendingObj = rejCards
                    ? {
                        hand: handIds,
                        joker_rank: jokerRank,
                        deck_cnt: deckCount,
                        p_array: pArrayIds,
                        rejected_array: rejectedCardIds,
                        picked_array: pickedCardIds,
                    }
                    : {
                        hand: handIds,
                        joker_rank: jokerRank,
                        deck_cnt: deckCount,
                        p_array: pArrayIds,
                    };
                const url = `${this.botHost}${this.THROW}`;
                const userInfo = yield this.retryRequest(() => axios_1.default.post(`${this.botHost}${this.THROW}`, sendingObj), url);
                newLogger_1.Logger.info('ThrowOutputBotService: ', [
                    tableId,
                    userInfo.data,
                ]);
                const { thrownCard, groupCards } = (0, helper_1.throwOutPutFormator)(userInfo.data, hand);
                newLogger_1.Logger.info('RawThrowOutputBotService: ', [
                    tableId,
                    thrownCard,
                    groupCards,
                ]);
                return {
                    thrownCard,
                    isRummy: userInfo.data['rummy_complete'],
                    groupCards,
                };
            }
            catch (e) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR_throw`, [e, tableId]);
                throw e;
            }
        });
    }
    static getLobby(lobbyId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`getLobby request `, [lobbyId]);
                const lobbyInfo = yield axios_1.default.get(`${this.host}${this.GET_LOBBY}/${lobbyId}`, {
                    headers: {
                        Authorization: defaultToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                    },
                });
                newLogger_1.Logger.info(`getLobby response `, [lobbyInfo.data.data]);
                return lobbyInfo.data.data;
            }
            catch (e) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR`, [e, lobbyId]);
                throw e;
            }
        });
    }
    static getActiveMatch(authToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const lobbyInfo = yield axios_1.default.get(`${this.host}${this.GET_ACTIVE_MATCH}`, {
                    headers: {
                        Authorization: authToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                    },
                });
                return lobbyInfo.data.data;
            }
            catch (e) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR`, [e]);
                throw e;
            }
        });
    }
    static getUserWallet(authToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`getUserWallet request `, [authToken]);
                const userInfo = yield axios_1.default.get(`${this.host}${this.WALLET_BALANCE}`, {
                    headers: {
                        Authorization: authToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                    },
                });
                newLogger_1.Logger.info(`getUserWallet response `, [authToken]);
                return userInfo.data.data;
            }
            catch (e) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR`, [e]);
                throw e;
            }
        });
    }
    static getUserProfile(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`getUserProfile request `, [userId]);
                const userInfo = yield axios_1.default.get(`${this.host}${this.GET_USER_PROFILE.replace('?', String(userId))}`, {
                    headers: {
                        Authorization: defaultToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                    },
                });
                newLogger_1.Logger.info(`getUserProfile response `, [userInfo.data.data]);
                return userInfo.data.data;
            }
            catch (e) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR`, [e, userId]);
                throw e;
            }
        });
    }
    static userAuth(authToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`userAuth request `, [authToken]);
                const userInfo = yield axios_1.default.get(`${this.host}${this.USER_AUTH}`, {
                    headers: {
                        Authorization: authToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                    },
                });
                newLogger_1.Logger.info(`userAuth response `, [userInfo.data.data]);
                return userInfo.data.data;
            }
            catch (e) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR`, [e]);
                throw e;
            }
        });
    }
    static getAvailableBot(lobbyAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userInfo = yield axios_1.default.get(`${this.host}${this.AVAILABLE_BOT}`, {
                    headers: {
                        Authorization: defaultToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                    },
                });
                return Object.assign(Object.assign({}, userInfo.data.data), { isPrime: false });
            }
            catch (e) {
                return false;
            }
        });
    }
    static generateBot() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userInfo = yield axios_1.default.get(`${this.host}${this.ADD_BOT}/1`, {
                    headers: {
                        Authorization: defaultToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                    },
                });
                return userInfo.data.data;
            }
            catch (e) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR`, [e]);
                throw e;
            }
        });
    }
    static updateProfile(userId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userInfo = yield axios_1.default.post(`${this.host}${this.UPDATE_PROFILE.replace('?', String(userId))}`, options, {
                    headers: {
                        Authorization: defaultToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                    },
                });
                return userInfo.data.data;
            }
            catch (e) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR`, [e, userId]);
                throw e;
            }
        });
    }
    static createBattle(userIds, lobbyId, matchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const IdempotencyKey = Date.now().toString();
                const url = `${this.host}${this.CREATE_BATTLE}`;
                const userInfo = yield this.retryRequest(() => axios_1.default.post(url, {
                    usersId: userIds,
                    lobbyId,
                    matchId,
                }, {
                    headers: {
                        Authorization: defaultToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                        'Idempotency-Key': IdempotencyKey,
                    },
                }), url);
                return userInfo.data.data;
            }
            catch (e) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR createBattle_error', [
                    e,
                    matchId,
                ]);
                throw e;
            }
        });
    }
    static cancelBattle(matchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const IdempotencyKey = Date.now().toString();
                const url = `${this.host}${this.CANCEL_MATCH}`;
                const userInfo = yield this.retryRequest(() => axios_1.default.post(`${this.host}${this.CANCEL_MATCH}`, {
                    matchId,
                }, {
                    headers: {
                        Authorization: defaultToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                        'Idempotency-Key': IdempotencyKey,
                    },
                }), url);
                return userInfo.data.data;
            }
            catch (e) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR createBattle_error', [
                    e,
                    matchId,
                ]);
                throw e;
            }
        });
    }
    static finishBattle(matchId, roundId, historyS3Id, winnersId, usersInfo, isFinalRound) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const IdempotencyKey = Date.now().toString();
                const payload = {
                    matchId: matchId,
                    roundId: roundId,
                    historyS3Id: historyS3Id,
                    winnersId: winnersId,
                    usersInfo: usersInfo,
                    isFinalRound: isFinalRound,
                };
                newLogger_1.Logger.info(`finishBattle request `, [payload]);
                const url = `${this.host}${this.FINISH_BATTLE}`;
                const userInfo = yield this.retryRequest(() => axios_1.default.post(url, payload, {
                    headers: {
                        Authorization: defaultToken,
                        'User-Agent': 'BestHTTP/2 v2.8.5',
                        'Idempotency-Key': IdempotencyKey,
                    },
                }), url);
                newLogger_1.Logger.info(`finishBattle response ${matchId}`, [
                    userInfo.data,
                ]);
                return userInfo.data;
            }
            catch (e) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR finishBattle_error', [
                    e,
                    matchId,
                ]);
                throw new errors_1.CancelBattleError(e.messsage, e);
            }
        });
    }
}
exports.default = UserService;
UserService.host = process.env.USER_SERVICE_URL;
UserService.botHost = process.env.BOT_SERVICE_URL;
UserService.GET_LOBBY = '/lobby';
UserService.GET_ACTIVE_MATCH = '/user/activeMatch';
UserService.USER_AUTH = '/user/auth';
UserService.UPDATE_PROFILE = '/internal/updateProfile/?';
UserService.WALLET_BALANCE = '/user/wallet';
UserService.AVAILABLE_BOT = '/internal/bot/available';
UserService.ADD_BOT = '/add/bots';
UserService.GET_USER_PROFILE = '/internal/v2/?/profile';
UserService.CREATE_BATTLE = '/v2/match/create';
UserService.FINISH_BATTLE = '/v2/match/finish';
UserService.CANCEL_MATCH = '/v2/match/cancel';
UserService.PICK = '/pick';
UserService.DROP = '/drop';
UserService.THROW = '/get_throw_multi_deck';
