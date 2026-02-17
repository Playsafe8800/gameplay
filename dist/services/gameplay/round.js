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
exports.round = void 0;
const newLogger_1 = require("../../newLogger");
const connections_1 = require("../../connections");
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const roundScoreCard_1 = require("../../db/roundScoreCard");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const turnHistory_1 = require("../../db/turnHistory");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const date_1 = require("../../utils/date");
const turnHistory_2 = require("../../utils/turnHistory");
const schedulerQueue_1 = require("../schedulerQueue");
const tableOperation_1 = require("../signUp/tableOperation");
const cardHandler_1 = require("./cardHandler");
const events_1 = require("../../state/events");
const events_2 = require("../../constants/events");
const index_1 = require("../../utils/index");
const redlock_1 = require("../../utils/lock/redlock");
const redlock_2 = require("redlock");
const { MAX_TIMEOUT } = connections_1.zk.getConfig();
const seatShuffle_1 = require("./seatShuffle");
class Round {
    startRound(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            let lock;
            try {
                newLogger_1.Logger.info(`startRound: ${tableId}`);
                lock = yield redlock_1.redlock.Lock.acquire([`lock:${tableId}`], 2000);
                const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    'maximumPoints',
                    'gameType',
                    'bootValue',
                    'currentRound',
                    'isNewGameTableUI',
                    "isMultiBotEnabled"
                ]);
                if (!tableConfigData)
                    throw new Error(`Table configuration not set for tableId ${tableId}`);
                const tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, tableConfigData.currentRound, ['dealerPlayer', 'potValue', 'seats', 'tableState']);
                if (!tableGameData)
                    throw new Error(`Table gameplay data not set for tableId ${tableId}`);
                tableGameData.seats = tableGameData.seats.filter((e) => e._id);
                if (tableGameData.tableState === constants_1.TABLE_STATE.WINNER_DECLARED ||
                    tableGameData.tableState === constants_1.TABLE_STATE.PLAY_MORE) {
                    const errMsg = 'winner has already been declared';
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR`, [
                        errMsg,
                        tableId,
                        tableGameData,
                    ]);
                    throw new Error(errMsg);
                }
                // seat shuffle If multiple player are here
                if (tableConfigData.isMultiBotEnabled) {
                    let currentPlayersInTable = tableGameData.seats
                        .filter((seat) => seat._id)
                        .sort((a, b) => a.seat - b.seat);
                    const seatIndexsToChange = [];
                    const botIndexs = [];
                    const alreadyPushed = [];
                    for (let i = 0; i < currentPlayersInTable.length; i++) {
                        const firstEle = currentPlayersInTable[i];
                        const secondEle = currentPlayersInTable[i + 1]
                            ? currentPlayersInTable[i + 1]
                            : currentPlayersInTable[0];
                        if (!firstEle.isBot && !secondEle.isBot) {
                            if (!alreadyPushed.includes(firstEle._id))
                                seatIndexsToChange.push({
                                    _id: firstEle._id,
                                    seat: firstEle.seat,
                                });
                            if (!alreadyPushed.includes(secondEle._id))
                                seatIndexsToChange.push({
                                    _id: secondEle._id,
                                    seat: secondEle.seat,
                                });
                            alreadyPushed.push(firstEle._id, secondEle._id);
                        }
                        if (firstEle.isBot)
                            botIndexs.push({
                                _id: firstEle._id,
                                seat: firstEle.seat,
                            });
                    }
                    let newTgpSeats = [];
                    if (seatIndexsToChange.length) {
                        const newSeats = [];
                        let realIdx = 0, botIdx = 0;
                        while (realIdx < seatIndexsToChange.length ||
                            botIdx < botIndexs.length) {
                            if (realIdx < seatIndexsToChange.length) {
                                newSeats.push(Object.assign(Object.assign({}, seatIndexsToChange[realIdx]), { seat: newSeats.length }));
                                realIdx++;
                            }
                            if (botIdx < botIndexs.length) {
                                newSeats.push(Object.assign(Object.assign({}, botIndexs[botIdx]), { seat: newSeats.length }));
                                botIdx++;
                            }
                        }
                        const usedIds = new Set([
                            ...seatIndexsToChange.map((s) => s._id),
                            ...botIndexs.map((b) => b._id),
                        ]);
                        currentPlayersInTable.forEach((seat) => {
                            if (!usedIds.has(seat._id)) {
                                newSeats.push(Object.assign(Object.assign({}, seat), { seat: newSeats.length }));
                            }
                        });
                        newTgpSeats = newSeats.map((e) => {
                            delete e.isBot;
                            return e;
                        });
                        tableGameData.seats = newTgpSeats;
                        newLogger_1.Logger.info(`new seats after shuffle `, [
                            seatIndexsToChange,
                            botIndexs,
                            newTgpSeats,
                            currentPlayersInTable,
                        ]);
                        yield (0, seatShuffle_1.seatShuffle)(tableId, tableConfigData.currentRound, { seats: newSeats }, [], false, {
                            playerInfo: newTgpSeats.map((e) => {
                                return { userId: e._id };
                            }),
                        });
                    }
                }
                const prevTableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, tableConfigData.currentRound - 1, ['dealerPlayer']);
                let prevDealer = null;
                if (prevTableGameData && prevTableGameData.dealerPlayer) {
                    prevDealer = prevTableGameData.dealerPlayer;
                }
                // let { seats } = tableGameData;
                const { potValue } = tableGameData;
                const { currentRound, gameType } = tableConfigData;
                const { playingSeats = [], allPlayerGamePlay = [] } = yield this.getAllPlayersPGPandSeatsInfo(tableId, currentRound, tableConfigData.maximumPoints, tableGameData.seats);
                /**
                 * if only 1 playing player is left in the table
                 * this case will occur when every got eliminated in previous round expect one
                 * and no eliminated player did rejoin/rebuy
                 */
                if (playingSeats.length === 1) {
                    // finish the round here
                }
                let { dealerId } = this.chooseDealer(playingSeats, prevDealer);
                /**
                 * toss cards to choose dealer for first round only
                 * and every round for points rummy
                 */
                if ((tableConfigData === null || tableConfigData === void 0 ? void 0 : tableConfigData.isNewGameTableUI) &&
                    ((0, index_1.isPointsRummyFormat)(gameType) ||
                        (!prevDealer && currentRound === 1))) {
                    const tossCardsWithUserIds = yield cardHandler_1.cardHandler.chooseCardsForDealerToss(tableGameData.seats);
                    const [dealerPlayerData] = tossCardsWithUserIds.filter((twu) => twu.tossWinner);
                    // get previous user to set as dealer
                    const previousUser = this.getPreviousPlayer(dealerPlayerData === null || dealerPlayerData === void 0 ? void 0 : dealerPlayerData.userId, allPlayerGamePlay);
                    dealerId = previousUser;
                    const chooseDealerPayload = {
                        tableId,
                        playerInfo: tossCardsWithUserIds.map((e) => {
                            if (e.userId === dealerId) {
                                e.tossWinner = true;
                            }
                            else {
                                if (e.tossWinner)
                                    delete e.tossWinner;
                            }
                            return e;
                        }),
                    };
                    yield socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.CHOOSE_DEALER_SOCKET_EVENT, chooseDealerPayload);
                    yield schedulerQueue_1.scheduler.addJob.cardTossToChooseDealer(tableId);
                }
                /**
                 * toss cards to choose dealer
                 */
                const playersData = yield Promise.all(playingSeats.map((e) => userProfile_1.userProfileService.getOrCreateUserDetailsById(e._id)));
                const dealerObj = playersData.find((user) => user.id === dealerId);
                if (!dealerObj)
                    throw new Error(`Dealer didn't get set ${tableId}`);
                tableGameData.dealerPlayer = dealerId;
                if (!(0, index_1.isPointsRummyFormat)(tableConfigData.gameType)) {
                    tableGameData.potValue =
                        tableConfigData.currentRound === 1
                            ? tableConfigData.bootValue * tableGameData.seats.length
                            : potValue;
                }
                yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, tableConfigData.currentRound, tableGameData);
                // on 2nd round onwards, no need to wait for 2 sec and for oldUI also
                // don't send for points rummy
                if (!(tableConfigData === null || tableConfigData === void 0 ? void 0 : tableConfigData.isNewGameTableUI) ||
                    (prevDealer && !(0, index_1.isPointsRummyFormat)(gameType))) {
                    this.startRoundToSendCards(tableId);
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR startRound ${tableId}`, [
                    error,
                ]);
            }
            finally {
                try {
                    if (lock && lock instanceof redlock_2.Lock) {
                        yield redlock_1.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in startRound; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on leaveTable: `, err);
                }
            }
            return true;
        });
    }
    startRoundToSendCards(tableId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(`startRoundToSendCards: ${tableId}`);
            try {
                const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    '_id',
                    'currentRound',
                    'maximumPoints',
                    'maximumSeat',
                    'gameType',
                    'currencyType',
                ]);
                if (!tableConfigData)
                    throw new Error(`startRoundToSendCards: Table configuration not set for tableId ${tableId}`);
                const tableGameData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, tableConfigData.currentRound, ['trumpCard', 'seats', 'dealerPlayer']);
                if (!tableGameData)
                    throw new Error(`startRoundToSendCards: Table gameplay data not set for tableId ${tableId}`);
                const { currentRound, maximumPoints } = tableConfigData;
                const { seats } = tableGameData;
                const { playingSeats = [], allPlayerGamePlay = [] } = yield this.getAllPlayersPGPandSeatsInfo(tableId, currentRound, maximumPoints, seats);
                const userObjectIds = seats.map((seat) => seat._id);
                const playersData = yield Promise.all(playingSeats.map((e) => userProfile_1.userProfileService.getOrCreateUserDetailsById(e._id)));
                const { dealerPlayer: dealerId } = tableGameData;
                const dealerObj = playersData.find((user) => user.id === dealerId);
                const dealerIndex = (_a = playingSeats.find((user) => user._id === dealerId)) === null || _a === void 0 ? void 0 : _a.seatIndex;
                if (!dealerObj || typeof dealerIndex === 'undefined')
                    throw new Error(`Dealer didn't get set ${tableId}`);
                const nextTurn = this.getNextPlayer(dealerObj.id, allPlayerGamePlay);
                const { usersCards, wildCard, papluCard, firstOpenCard, shuffledDeck } = yield this.distributeCards(tableConfigData, playersData, tableConfigData.currencyType === constants_1.CURRENCY_TYPE.COINS);
                tableGameData.trumpCard = wildCard;
                tableGameData.papluCard = papluCard;
                tableGameData.closedDeck = shuffledDeck;
                tableGameData.opendDeck = firstOpenCard;
                tableGameData.tableState = constants_1.TABLE_STATE.ROUND_STARTED;
                yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, tableConfigData.currentRound, tableGameData);
                // open discarded card initialisation and modification
                const openDiscardedCardsData = {
                    openCards: [
                        {
                            userId: 0,
                            card: firstOpenCard[0],
                        },
                    ],
                };
                yield tableGameplay_1.tableGameplayService.setOpenDiscardedCards(tableId, currentRound, openDiscardedCardsData);
                // RETURNS ARRAY containing playerGamePlay data
                // SAVING USER CARDS IN DB
                const [playerGamePlayData] = yield Promise.all([
                    playerGameplay_1.playerGameplayService.updateCardsByRoundId(playingSeats, usersCards, tableId, currentRound, wildCard, tableConfigData.maximumPoints, papluCard),
                    tableGameplay_1.tableGameplayService.setTableGameplay(tableId, tableConfigData.currentRound, tableGameData),
                    events_1.eventStateManager.fireEvent(tableId, events_2.STATE_EVENTS.LOCK_IN_PERIOD_TIMER),
                ]);
                /**
                 * this function moves the dealer to index 0 in array while keeping the order
                 */
                const reorderedSeats = this.rearrangedSeats(userObjectIds, dealerIndex);
                const playersDataArr = yield Promise.all(seats.map((e) => userProfile_1.userProfileService.getUserDetailsById(e._id)));
                const eventData = {
                    tableConfigData,
                    tableGameData,
                    usersCards,
                    playersData: playersDataArr,
                    playingSeats: seats,
                    wildCard,
                    firstOpenCard: firstOpenCard[0],
                    nextTurn,
                    seats: reorderedSeats,
                    dealerId: dealerIndex,
                };
                const dealerAndTableCard = {
                    tableId,
                    dealer: dealerId,
                    wildCard,
                    papluCard,
                    firstOpenDeckCard: firstOpenCard[0],
                    roundNumber: currentRound,
                };
                tableGameData.seats = seats;
                eventData.seats = eventData.seats.map((seat) => seat.seat);
                const userSocketIdMap = {};
                playersData.forEach((userProfile) => {
                    userSocketIdMap[userProfile.id] = userProfile.socketId;
                });
                playerGamePlayData.forEach((updatedPGP, index) => __awaiter(this, void 0, void 0, function* () {
                    eventData.seatIndex = index;
                    const { userId, currentCards, groupingCards = [], } = updatedPGP || {};
                    const { score, meldLabel } = cardHandler_1.cardHandler.groupCardsOnMeld(groupingCards, tableGameData.trumpCard, tableConfigData.maximumPoints, tableGameData.papluCard);
                    const formattedData = Object.assign({
                        cards: currentCards,
                        group: groupingCards,
                        meld: meldLabel,
                        score,
                    }, dealerAndTableCard);
                    yield socketOperation_1.socketOperation.sendEventToClient(userSocketIdMap[userId || 0], formattedData, constants_1.EVENTS.SET_MY_CARDS);
                    // instrumentation call
                    // userRummyRoundStarted(
                    //   tableConfigData,
                    //   tableGameData,
                    //   userId || 0,
                    // );
                }));
                const initialTurnPayload = {
                    tableId,
                    roundNumber: currentRound,
                    nextTurn,
                    userIds: userObjectIds,
                };
                schedulerQueue_1.scheduler.addJob.initialTurnSetup(initialTurnPayload, constants_1.NUMERICAL.TWO * constants_1.NUMERICAL.THOUSAND);
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR startRoundToSendCards ${tableId}`, [error]);
            }
        });
    }
    getAllPlayersPGPandSeatsInfo(tableId, currentRound, maximumPoints, seats) {
        return __awaiter(this, void 0, void 0, function* () {
            const playingSeats = [];
            const playingGameData = [];
            const eliminatedUsers = [];
            let allPlayerGamePlay = [];
            //@ts-ignore
            allPlayerGamePlay = yield Promise.all(seats.map((ele) => playerGameplay_1.playerGameplayService.getPlayerGameplay(ele._id, tableId, currentRound, ['userStatus', 'userId', 'dealPoint'])));
            allPlayerGamePlay = allPlayerGamePlay.filter((seat) => seat);
            seats = allPlayerGamePlay
                .filter((player) => player && player.userStatus !== constants_1.PLAYER_STATE.LEFT)
                .map((player, i) => {
                if (player && player.userStatus !== constants_1.PLAYER_STATE.LEFT) {
                    const seatObj = {
                        _id: player.userId,
                        seatIndex: i,
                        seat: i,
                    };
                    playingGameData.push(player);
                    if (player.userStatus === constants_1.PLAYER_STATE.PLAYING ||
                        player.dealPoint < maximumPoints) {
                        playingSeats.push(seatObj);
                    }
                    if (player.dealPoint >= maximumPoints) {
                        eliminatedUsers.push(player);
                    }
                    return seatObj;
                }
            });
            return {
                playingSeats,
                playingGameData,
                eliminatedUsers,
                allPlayerGamePlay,
            };
        });
    }
    /**
     * @deprecated
     */
    splitToChunks(array, parts) {
        const result = [];
        for (let i = parts; i > 0; i--) {
            result.push(array.splice(0, Math.ceil(array.length / i)));
        }
        return result;
    }
    chooseDealer(seats, prevDealer) {
        const prevDealerSeat = seats.find((seat) => seat._id === prevDealer);
        let nextDealer = Math.floor(Math.random() * seats.length);
        if (prevDealerSeat) {
            nextDealer = prevDealerSeat.seatIndex + 1;
        }
        const seat = seats[nextDealer % seats.length];
        return {
            dealerId: seat._id,
            dealerIndex: seat.seatIndex,
        };
    }
    getNextPlayer(currentTurn, allSeats) {
        let arrIndex = allSeats.findIndex((seat) => seat.userId === currentTurn);
        arrIndex += 1;
        arrIndex %= allSeats.length;
        for (let i = 0; i < allSeats.length; ++i) {
            if (allSeats[arrIndex].userStatus !== constants_1.PLAYER_STATE.PLAYING) {
                arrIndex += 1;
                arrIndex %= allSeats.length;
            }
        }
        return allSeats[arrIndex].userId;
    }
    getPreviousPlayer(currentTurn, allSeats) {
        let arrIndex = allSeats.findIndex((seat) => seat.userId === currentTurn);
        arrIndex = arrIndex !== 0 ? arrIndex - 1 : allSeats.length - 1;
        for (let i = allSeats.length; i > 0; --i) {
            if (allSeats[arrIndex].userStatus !== 'playing') {
                arrIndex -= 1;
            }
        }
        return allSeats[arrIndex].userId;
    }
    removeBotCards(cards, botCards) {
        const botCardsSet = new Set(botCards);
        return cards.filter((card) => !botCardsSet.has(card));
    }
    getRandomCardSequence(cards) {
        const suits = {};
        cards.forEach((card) => {
            const [suit, num] = card.split('-');
            const number = parseInt(num);
            if (!suits[suit])
                suits[suit] = new Map();
            suits[suit].set(number, (suits[suit].get(number) || 0) + 1);
        });
        const allSequences = [];
        Object.keys(suits).forEach((suit) => {
            if (suit === 'J')
                return;
            const numberMap = suits[suit];
            const numbers = [...numberMap.keys()].sort((a, b) => a - b);
            for (let i = 0; i <= numbers.length - 3; i++) {
                let sequence = [];
                let valid = true;
                let length = 0;
                // Check sequences of length 3 or 4
                for (let len = 0; len < 4 && i + len < numbers.length; len++) {
                    const currentNum = numbers[i + len];
                    const prevNum = len === 0 ? currentNum - 1 : numbers[i + len - 1];
                    // Check if numbers are consecutive and available
                    if (currentNum !== prevNum + 1 ||
                        !numberMap.get(currentNum)) {
                        valid = false;
                        break;
                    }
                    sequence.push(currentNum);
                    length++;
                    // Add sequence if length is 3 or 4
                    if (length >= 3) {
                        const cardSeq = sequence.map((num) => {
                            const deckNum = numberMap.get(num) > 1 && Math.random() < 0.5 ? 1 : 0;
                            return `${suit}-${num}-${deckNum}`;
                        });
                        allSequences.push(cardSeq);
                    }
                }
            }
        });
        return allSequences.length > 0
            ? allSequences[Math.floor(Math.random() * allSequences.length)]
            : null;
    }
    distributeCards(tableConfigData, playersData, isFree) {
        return __awaiter(this, void 0, void 0, function* () {
            let CARDS_PER_PLAYER = 13;
            let cards = tableConfigData.maximumSeat === constants_1.NUMERICAL.TWO
                ? [...constants_1.SINGLE_DECK]
                : [...constants_1.DOUBLE_DECK];
            let allSequences = tableConfigData.maximumSeat === constants_1.NUMERICAL.TWO ? constants_1.SINGLE_DECK_COMBINATIONS : constants_1.DOUBLE_DECK_COMBINATIONS;
            const hasBot = playersData.some((player) => player.isBot);
            const realPlayer = hasBot
                ? playersData.find((player) => !player.isBot)
                : undefined;
            let realPlayerProfitLoss = 0;
            if (realPlayer) {
                for (const player of playersData) {
                    const giveBotFavorThreshold = constants_1.BOT_CONFIG.GIVE_BOT_FAVOR_THRESHOLD;
                    if (!player.isBot && player.profitLoss >= giveBotFavorThreshold)
                        realPlayerProfitLoss = player.profitLoss;
                }
            }
            const usersCards = [];
            for (const player of playersData) {
                const playerCards = [];
                const isSetBotCardsEnable = constants_1.BOT_CONFIG.BOT_SET_CARD_ENABLE;
                let giveSetCards = false;
                if (isFree && !player.isBot) {
                    giveSetCards = true;
                }
                else if (isSetBotCardsEnable &&
                    hasBot &&
                    realPlayer &&
                    player.isBot &&
                    !isFree) {
                    if (realPlayerProfitLoss > 0)
                        giveSetCards = true;
                }
                if (giveSetCards) {
                    const setCards = allSequences[Math.floor(Math.random() * allSequences.length)];
                    const setCardSet = new Set(setCards);
                    allSequences = allSequences.filter(seq => seq.every(card => !setCardSet.has(card)));
                    const alreadySetCards = setCards.flat();
                    cards = this.removeBotCards(cards, alreadySetCards);
                    playerCards.push(...alreadySetCards);
                }
                newLogger_1.Logger.info(`distributedInitialCards`, [
                    playerCards,
                    player.id,
                    tableConfigData._id,
                ]);
                usersCards.push(playerCards);
            }
            for (let i = 0; i < usersCards.length; i++) {
                let usersCard = usersCards[i];
                while (usersCard.length < CARDS_PER_PLAYER) {
                    const randomIndex = Math.floor(Math.random() * cards.length);
                    usersCard.push(cards[randomIndex]);
                    cards.splice(randomIndex, 1);
                }
                usersCards[i] = usersCard;
            }
            // selecting wildCards
            // if joker comes in wildCard then card shifting takes place until we get card that is not joker
            let shuffledDeck = this.shuffleCards(cards);
            shuffledDeck = this.shuffleCards(shuffledDeck);
            while (shuffledDeck[0] && shuffledDeck[0].split('-')[0] === 'J') {
                shuffledDeck.push(shuffledDeck[0]);
                shuffledDeck.splice(0, 1);
            }
            const [wildCard] = shuffledDeck.splice(0, 1);
            // compute Paplu: same suit, next rank (K->A wraps to 1)
            const [wSuit, wRankStr] = wildCard.split('-');
            const wRank = parseInt(wRankStr, 10);
            const nextRank = wRank === 13 ? 1 : wRank + 1;
            const papluCard = `${wSuit}-${nextRank}-0`; // suit-specific, deck-agnostic
            console.log(papluCard, '---papluCard--');
            // selecting first face up card
            // const firstOpenCard = ['J-1-0'];
            const firstOpenCard = shuffledDeck.splice(0, 1); // ['J-1-0'];
            return {
                usersCards,
                wildCard,
                papluCard,
                firstOpenCard,
                shuffledDeck,
            };
        });
    }
    shuffleCards(cards) {
        const shuffle = [];
        while (cards.length > 0) {
            const randomNumber = Math.floor(Math.random() * cards.length);
            shuffle.push(cards[randomNumber]);
            cards.splice(randomNumber, 1);
        }
        return shuffle;
    }
    rearrangedSeats(seats, dealerIndex) {
        const returnValue = [];
        let loopTill = seats.length;
        for (let i = dealerIndex; i < loopTill; ++i) {
            returnValue.push({ _id: seats[i], seatIndex: i, seat: i });
        }
        loopTill = dealerIndex;
        for (let i = 0; i < loopTill; ++i) {
            returnValue.push({ _id: seats[i], seatIndex: i, seat: i });
        }
        return returnValue;
    }
    // this function will be called with await and a lock will been taken by it's parent function.
    startUserTurn(tableId, currentRound, nextTurn, playerGamePlays) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                newLogger_1.Logger.info(`startUserTurn: ${tableId}:${currentRound}, nextTurn: ${nextTurn} PGP List: `, [playerGamePlays]);
                const currentTime = new Date();
                if (playerGamePlays.length <= 1)
                    throw new Error('startUserTurn::>Error: "playingTableData not found!!!"');
                const [playerGamePlay] = playerGamePlays.filter((e) => (e === null || e === void 0 ? void 0 : e.userId) === nextTurn);
                if (!playerGamePlay)
                    throw new Error(`Player gameplay not found for ${tableId}`);
                let isShowTimeOutMsg = false;
                if (playerGamePlay.timeoutCount >= MAX_TIMEOUT)
                    isShowTimeOutMsg = true;
                const [tableGameData, userProfile] = yield Promise.all([
                    tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                        '_id',
                        'trumpCard',
                        'turnCount',
                        'seats',
                        'opendDeck',
                        'closedDeck',
                        'currentTurn',
                        'randomWinTurn',
                        'botTurnCount',
                    ]),
                    userProfile_1.userProfileService.getOrCreateUserDetailsById(playerGamePlay === null || playerGamePlay === void 0 ? void 0 : playerGamePlay.userId),
                ]);
                const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    'userTurnTimer',
                    'currentRound',
                    'userTurnTimer',
                    'maximumPoints',
                    'gameType',
                    'maximumSeat',
                    'currencyType',
                    'bootValue',
                ]);
                if (!tableGameData || !userProfile || !tableConfigData)
                    throw new Error(`Tablegame data ${tableGameData} or userprofile ${userProfile} doesn't exist for user turn start ${tableId}`);
                let firstPick = !tableGameData.turnCount;
                tableGameData.currentTurn = playerGamePlay.userId;
                tableGameData.noOfPlayers = tableGameData.seats.length;
                tableGameData.tableCurrentTimer = new Date(currentTime.setSeconds(currentTime.getSeconds() +
                    Number(tableConfigData.userTurnTimer))).toISOString();
                // turn history initialisation and modification
                let currentRoundHistory = yield turnHistory_1.turnHistoryService.getTurnHistory(tableId, currentRound);
                if (!currentRoundHistory) {
                    currentRoundHistory =
                        turnHistory_1.turnHistoryService.getDefaultCurrentRoundTurnHistoryData(tableConfigData, tableGameData);
                    // turnHistory.history.push(currentRoundHistory);
                }
                const historyObj = {
                    turnNo: currentRoundHistory.turnsDetails.length + 1,
                    userId: userProfile.id,
                    turnStatus: '',
                    startState: playerGamePlay.currentCards.toString(),
                    cardPicked: '',
                    cardPickSource: '',
                    cardDiscarded: '',
                    endState: '',
                    createdOn: new Date().toISOString(),
                    points: 0,
                    sortedStartState: (0, turnHistory_2.sortedCards)(playerGamePlay.groupingCards, playerGamePlay.meld || []),
                    sortedEndState: (0, turnHistory_2.sortedCards)([], []),
                    isBot: userProfile.isBot,
                    wildCard: tableGameData.trumpCard,
                    closedDeck: tableGameData.closedDeck,
                    openedDeckTop: tableGameData.opendDeck[tableGameData.opendDeck.length - 1],
                };
                currentRoundHistory.turnsDetails.push(historyObj);
                if (currentRoundHistory.turnsDetails.length !== 1) {
                    tableGameData.turnCount =
                        currentRoundHistory.turnsDetails.length;
                    firstPick = false;
                }
                yield Promise.all([
                    tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameData),
                    turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory),
                ]);
                const endTime = date_1.dateUtils.addEpochTimeInSeconds(tableConfigData === null || tableConfigData === void 0 ? void 0 : tableConfigData.userTurnTimer);
                const userTurnData = {
                    tableId,
                    userId: tableGameData.currentTurn,
                    time: endTime,
                    isShowTimeOutMsg,
                    dropGame: (0, index_1.getDropPoints)(playerGamePlay ? playerGamePlay.isFirstTurn : false, tableConfigData.maximumPoints, tableConfigData.gameType, tableConfigData.maximumSeat),
                };
                const eventName = firstPick
                    ? constants_1.EVENTS.FIRST_USER_TURN_START
                    : constants_1.EVENTS.USER_TURN_START;
                yield Promise.all([
                    events_1.eventStateManager.fireEvent(tableId, events_2.STATE_EVENTS.TURN_STARTED),
                    socketOperation_1.socketOperation.sendEventToRoom(tableId, eventName, userTurnData),
                ]);
                newLogger_1.Logger.info(`USER_TURN_STARTED_SOCKET_EVENT: tableId: ${tableId}`, [userTurnData, tableConfigData, playerGamePlays, nextTurn]);
                // if (playerGamePlay.isAutoDrop) {
                //   const client = await socketOperation.getSocketFromSocketId(
                //     userProfile.socketId,
                //   );
                //   // if (client) {
                //   //   client.userId = userProfile.id;
                //   // }
                //   await dropGame(
                //     { tableId, dropAndSwitch: playerGamePlay.isAutoDropSwitch },
                //     client || { userId: userProfile.id },
                //     GAME_END_REASONS.DROP,
                //   );
                //   return;
                // } else {
                const allUserIds = yield Promise.all(tableGameData.seats.map((seat) => userProfile_1.userProfileService.getUserDetailsById(seat._id)));
                const dropPointUsers = {};
                const userTurnPromise = [];
                tableGameData.seats.forEach((seat) => {
                    const currentPGP = playerGamePlays.find((pgp) => pgp.userId === seat._id);
                    const currentUser = allUserIds.find((user) => (user === null || user === void 0 ? void 0 : user.id) === seat._id);
                    if (currentPGP && currentUser) {
                        const currentDropGame = (0, index_1.getDropPoints)(currentPGP.isFirstTurn, tableConfigData.maximumPoints, tableConfigData.gameType, tableConfigData.maximumSeat);
                        dropPointUsers[seat._id] = currentDropGame;
                        const userTurnData = {
                            tableId,
                            userId: tableGameData.currentTurn,
                            time: endTime,
                            isShowTimeOutMsg,
                            dropGame: currentDropGame,
                            dropPointUsers,
                        };
                        userTurnPromise.push(socketOperation_1.socketOperation.sendEventToPlayingPlayersOnly(currentUser.socketId, userTurnData, eventName, currentPGP));
                    }
                });
                yield Promise.all([
                    userTurnPromise,
                    yield schedulerQueue_1.scheduler.addJob.playerTurnTimer(tableId, tableGameData.currentTurn, tableConfigData.userTurnTimer * constants_1.NUMERICAL.THOUSAND),
                ]);
                // }
                if (userProfile.isBot) {
                    const [opponentPlayerGamePlay] = playerGamePlays.filter((e) => (e === null || e === void 0 ? void 0 : e.userId) !== nextTurn);
                    if (opponentPlayerGamePlay) {
                        yield this.startBotTurn(tableId, userProfile, tableGameData.botTurnCount);
                    }
                    else {
                        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR opponentPlayerGamePlay not found ${tableId} ${nextTurn} ${tableGameData.currentTurn} `, [playerGamePlays]);
                    }
                    tableGameData.botTurnCount += 1;
                    yield tableGameplay_1.tableGameplayService.setTableGameplay(tableId, tableConfigData.currentRound, tableGameData);
                }
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR startUserTurn ${tableId}, next turn ${nextTurn}`, [error]);
            }
        });
    }
    startBotTurn(tableId, userProfile, botTurnCount) {
        return __awaiter(this, void 0, void 0, function* () {
            const ran = Math.floor(Math.random() * (constants_1.NUMERICAL.SIX - constants_1.NUMERICAL.TWO + 1) +
                constants_1.NUMERICAL.TWO);
            yield schedulerQueue_1.scheduler.addJob.botTurn(tableId, userProfile.id, botTurnCount, Math.ceil(constants_1.NUMERICAL.SIXTEEN / ran) * constants_1.NUMERICAL.THOUSAND);
        });
    }
    saveRoundScoreCardData(tableId, winnerData) {
        return __awaiter(this, void 0, void 0, function* () {
            let lastScoreCardData = yield roundScoreCard_1.roundScoreCardService.getRoundScoreCard(tableId);
            newLogger_1.Logger.info(`saveRoundScoreCardData: tableId: ${tableId}`, [
                winnerData,
                lastScoreCardData,
            ]);
            const scores = winnerData.playerInfo.map((player) => {
                return {
                    score: [player.points],
                    totalScore: player.totalPoints,
                    userId: player.userId,
                    username: player.username,
                };
            });
            if (!lastScoreCardData) {
                lastScoreCardData = scores;
            }
            else {
                lastScoreCardData = lastScoreCardData.map((score) => {
                    const scoreObj = scores.find((newScore) => newScore.userId === score.userId);
                    if (!scoreObj) {
                        const newScore = score.score.pop();
                        score.score.push(newScore);
                        score.score.push(newScore);
                    }
                    else {
                        score.score = [...score.score, ...scoreObj.score];
                        score.totalScore = scoreObj.totalScore;
                    }
                    return score;
                });
            }
            newLogger_1.Logger.info(`saveRoundScoreCardData: lastScoreCardData: `, [
                lastScoreCardData,
            ]);
            return roundScoreCard_1.roundScoreCardService.setRoundScoreCard(tableId, lastScoreCardData);
        });
    }
    setupInitialTurn(tableId, currentRound, nextTurn, players) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pgpResponse = yield Promise.all(players.map((userId) => {
                    return playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, [
                        'userId',
                        'isFirstTurn',
                        'userStatus',
                        'groupingCards',
                        'timeoutCount',
                        'currentCards',
                        'meld',
                    ]);
                }));
                const pgpArray = [];
                pgpResponse.forEach((pgp) => {
                    if (pgp)
                        pgpArray.push(pgp);
                });
                yield this.startUserTurn(tableId, currentRound, nextTurn, pgpArray);
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR error on setupInitialTurn', [error]);
            }
        });
    }
    createNewRound(tableData, tableGameData, secondaryTimer, usersInfo) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(`createNewRound: `, [tableData, tableGameData]);
            const { _id: tableId, currentRound } = tableData;
            const { seats } = tableGameData;
            const currentTime = new Date();
            const updatedTableData = yield tableConfiguration_1.tableConfigurationService.updateCurrentRound(tableId, currentRound);
            tableData.currentRound = currentRound + 1;
            tableGameData.tableState = constants_1.TABLE_STATE.ROUND_TIMER_STARTED;
            tableGameData.tableCurrentTimer = new Date(currentTime.setSeconds(currentTime.getSeconds() + Number(secondaryTimer))).toISOString();
            yield tableOperation_1.tableOperation.setupRound(tableId, tableData.currentRound, tableData, tableGameData);
            let tableGamePlayData;
            let seatsClone = [...seats];
            seatsClone = seatsClone.filter((seat) => seat._id !== null);
            // inserting players in table
            for (let i = 0; i < seatsClone.length; ++i) {
                let seat = null;
                if (tableData.shuffleEnabled) {
                    // shuffling the user seats
                    const randIndx = parseInt(`${Math.random() * seatsClone.length}`, 10);
                    seat = seatsClone[randIndx];
                    seatsClone[randIndx] = null;
                    seatsClone = seatsClone.filter(Boolean);
                    i -= 1;
                }
                else {
                    seat = seatsClone[i];
                }
                const playerGamePlayData = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, ['userId', 'userStatus', 'tableSessionId', 'dealPoint']);
                if (!playerGamePlayData)
                    throw new Error(`Player game play not found createNewRound`);
                if (playerGamePlayData.userStatus === constants_1.PLAYER_STATE.LEFT)
                    continue;
                const { userId } = playerGamePlayData;
                const userProfile = yield userProfile_1.userProfileService.getOrCreateUserDetailsById(userId, (_a = usersInfo.find((user) => userId === (user === null || user === void 0 ? void 0 : user.id))) === null || _a === void 0 ? void 0 : _a.socketId);
                if (userProfile) {
                    playerGamePlayData.userStatus = constants_1.PLAYER_STATE.PLAYING;
                    const { updatedTableGameplayData } = yield tableOperation_1.tableOperation.insertPlayerInTable(userProfile, tableData, playerGamePlayData, undefined, playerGamePlayData === null || playerGamePlayData === void 0 ? void 0 : playerGamePlayData.tableSessionId);
                    tableGamePlayData = updatedTableGameplayData;
                }
            }
            return { tableGamePlayData, tableData: updatedTableData };
        });
    }
    createNewRoundPoints(tableData, tableGameData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { _id: tableId, currentRound } = tableData;
            const { seats, standupUsers } = tableGameData;
            newLogger_1.Logger.info(`createNewRound ${tableId} >> currentRound: ${currentRound}`, [
                '\n >>  seats  >> \n',
                seats,
                '\n >> standupUsers  >> \n',
                standupUsers,
            ]);
            // remove standup user from seats
            const withoutStandupUserSeats = seats.map((e) => {
                const isUserStandup = standupUsers === null || standupUsers === void 0 ? void 0 : standupUsers.find((sta) => sta._id === e._id);
                if (isUserStandup)
                    e._id = null;
                delete e.userId;
                delete e.sessionId;
                return e;
            });
            newLogger_1.Logger.info(`createNewRoundPoints ${tableId} >> withoutStandupUserSeats: \n`, [withoutStandupUserSeats]);
            const tempSeats = Array(tableData.maximumSeat).fill({});
            for (let i = 0; i < tempSeats.length; i++) {
                tempSeats[i] = { _id: null, seat: i };
            }
            const newSeats = [];
            for (let i = 0; i < tempSeats.length; i++) {
                const sobj = tempSeats[i];
                const matchingUserSeat = withoutStandupUserSeats.find((us) => String(us.seat) === String(sobj.seat));
                if (matchingUserSeat) {
                    newSeats.push(matchingUserSeat);
                }
            }
            for (const seat of newSeats) {
                if (!(seat === null || seat === void 0 ? void 0 : seat._id))
                    continue;
                const playerGamePlayData = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, ['userStatus']);
                if (playerGamePlayData) {
                    // if user has state left then don't create new PGP
                    const { userStatus } = playerGamePlayData;
                    if (userStatus === constants_1.PLAYER_STATE.LEFT ||
                        userStatus === constants_1.PLAYER_STATE.WATCHING) {
                        seat._id = null;
                    }
                }
            }
            newLogger_1.Logger.info(`createNewRoundPoints ${tableId} >> newSeats: >> \n`, [newSeats]);
            tableData.currentRound = currentRound + 1;
            yield tableOperation_1.tableOperation.setupRound(tableId, tableData.currentRound, tableData, {
                seats: newSeats,
                standupUsers,
            });
            let tableGamePlayData;
            let seatsClone = [...seats];
            // inserting players in table
            for (let i = 0; i < seatsClone.length; ++i) {
                let seat = null;
                if (tableData.shuffleEnabled) {
                    // shuffling the user seats
                    const randIndx = parseInt(`${Math.random() * seatsClone.length}`, 10);
                    seat = seatsClone[randIndx];
                    seatsClone[randIndx] = null;
                    seatsClone = seatsClone.filter(Boolean);
                    i -= 1;
                }
                else {
                    seat = seatsClone[i];
                }
                const playerGamePlayData = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, ['userId', 'userStatus', 'tableSessionId', 'dealPoint']);
                if (playerGamePlayData) {
                    // if user has state left/watching then no need to create new PGP
                    const { userId, userStatus } = playerGamePlayData;
                    if (userStatus !== constants_1.PLAYER_STATE.LEFT &&
                        userStatus !== constants_1.PLAYER_STATE.WATCHING) {
                        const userProfile = yield userProfile_1.userProfileService.getOrCreateUserDetailsById(userId);
                        const { updatedTableGameplayData } = yield tableOperation_1.tableOperation.insertPlayerInTable(userProfile, tableData, playerGamePlayData, undefined, playerGamePlayData === null || playerGamePlayData === void 0 ? void 0 : playerGamePlayData.tableSessionId);
                        tableGamePlayData = updatedTableGameplayData;
                    }
                }
            }
            return { tableGamePlayData, tableData };
        });
    }
}
exports.round = new Round();
