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
exports.cardHandler = void 0;
const newLogger_1 = require("../../newLogger");
const redlock_1 = require("redlock");
const constants_1 = require("../../constants");
const events_1 = require("../../constants/events");
const constants_2 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const turnHistory_1 = require("../../db/turnHistory");
const objectModels_1 = require("../../objectModels");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const events_2 = require("../../state/events");
const utils_1 = require("../../utils");
const cards_1 = require("../../utils/cards");
const index_1 = require("../../utils/errors/index");
const redlock_2 = require("../../utils/lock/redlock");
const suffleCard_1 = require("../../utils/suffleCard");
const turnHistory_2 = require("../../utils/turnHistory");
const declareCard_1 = require("../finishEvents/declareCard");
const index_2 = require("../schedulerQueue/index");
const cancelBattle_1 = require("./cancelBattle");
const date_1 = require("../../utils/date");
const poolTypes_1 = require("../../constants/poolTypes");
class CardHandler {
    groupCards(data, socket, networkParams) {
        return __awaiter(this, void 0, void 0, function* () {
            let lock;
            try {
                const { tableId } = data;
                const { userId } = socket;
                lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 2000);
                newLogger_1.Logger.info(`Lock acquired, in groupCards resource:, ${lock.resource}`);
                let isValid = true;
                let currentCardsGroup = data.group;
                currentCardsGroup = currentCardsGroup.filter((cards) => cards.length > 0);
                // Get table config for current round
                const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, ['currentRound',
                    'maximumPoints']);
                const { currentRound } = tableConfigData;
                // Get PGP for current cards
                const [playerGameplayData, tableGameplayData] = yield Promise.all([
                    playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, ["userStatus",
                        "currentCards",
                        "groupingCards"]),
                    tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['trumpCard', 'papluCard']),
                ]);
                if (!playerGameplayData || !tableGameplayData) {
                    throw new Error(`TGP or PGP not found table: ${tableId}-${currentRound}, userId: ${userId} from groupCards`);
                }
                if (!(0, utils_1.issGroupingCardAndCurrentCardSame)([...playerGameplayData.currentCards], currentCardsGroup)) {
                    isValid = false;
                    currentCardsGroup = playerGameplayData.groupingCards;
                }
                newLogger_1.Logger.info(`currentCards: `, [
                    playerGameplayData.currentCards,
                    `${isValid} >> currentCardsGroup >> `,
                    currentCardsGroup,
                    tableId,
                    playerGameplayData.userStatus,
                ]);
                const { score, meld, meldLabel } = this.groupCardsOnMeld(currentCardsGroup, tableGameplayData.trumpCard, tableConfigData.maximumPoints);
                if (playerGameplayData.userStatus === constants_1.PLAYER_STATE.FINISH) {
                    return {
                        tableId,
                        isValid,
                        score,
                        meld: meldLabel,
                        group: currentCardsGroup,
                    };
                }
                // save score in PGP
                // playerGameplayData.points = score;
                playerGameplayData.meld = meld;
                playerGameplayData.groupingCards = currentCardsGroup;
                // playerGameplayData.points = score;
                if (networkParams) {
                    playerGameplayData.networkParams = networkParams;
                }
                yield playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGameplayData);
                return {
                    tableId,
                    isValid,
                    score,
                    meld: meldLabel,
                    group: currentCardsGroup,
                };
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR groupCards ${error.message} `, [error, data]);
                throw error;
            }
            finally {
                try {
                    if (lock && lock instanceof redlock_1.Lock) {
                        yield redlock_2.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in groupCards; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on groupCards: ${err}`, [err]);
                }
            }
        });
    }
    labelTheMeld(input) {
        const { cardsGroup, meld } = input;
        let firstLife = false;
        let secondLife = false;
        // {None, Pure, Impure, Set, Invalid, FirstLife, SecondLife, FirstLifeNeeded, SecondLifeNeeded}
        const result = [];
        // consider all pure sequence
        meld.forEach((meldv, index) => {
            if (meldv === objectModels_1.MELD.PURE) {
                if (!firstLife) {
                    firstLife = true;
                    result[index] = objectModels_1.MeldLabel.FIRST_LF;
                }
                else if (!secondLife) {
                    secondLife = true;
                    result[index] = objectModels_1.MeldLabel.SECOND_LF;
                }
                else {
                    result[index] = objectModels_1.MeldLabel.PURE_SEQ;
                }
            }
        });
        // consider all impure sequence, now possibly first life
        meld.forEach((meldv, index) => {
            if (meldv === objectModels_1.MELD.SEQUENCE) {
                if (firstLife) {
                    if (secondLife) {
                        result[index] = objectModels_1.MeldLabel.IMPURE_SEQ;
                    }
                    else {
                        secondLife = true;
                        result[index] = objectModels_1.MeldLabel.SECOND_LF;
                    }
                }
                else {
                    result[index] = objectModels_1.MeldLabel.FIRST_LF_NEEDED;
                }
            }
        });
        meld.forEach((meldv, index) => {
            if (meldv === objectModels_1.MELD.SET) {
                if (firstLife && secondLife) {
                    result[index] = objectModels_1.MeldLabel.SET;
                }
                else if (firstLife) {
                    result[index] = objectModels_1.MeldLabel.SECOND_LF_NEEDED;
                }
                else {
                    result[index] = objectModels_1.MeldLabel.FIRST_LF_NEEDED;
                }
            }
            else if (meldv === objectModels_1.MELD.DWD) {
                if (cardsGroup[index].length > 2) {
                    result[index] = objectModels_1.MeldLabel.INVALID;
                }
                else {
                    result[index] = objectModels_1.MeldLabel.NONE;
                }
            }
        });
        return result;
    }
    groupCardsOnMeld(cards, trumpCard, maximumPoints = poolTypes_1.POOL_TYPES.ONE_ZERO_ONE, papluCard) {
        newLogger_1.Logger.info(`groupCardsOnMeld imputs >> `, [cards, trumpCard, papluCard]);
        let meld = [];
        let score = 0;
        let setValid = false;
        let pureSeqAvailable = false;
        const filteredCards = cards.filter((cards) => cards.length > 0);
        meld = filteredCards.map((currentGroup) => {
            if (currentGroup.length < 3) {
                return objectModels_1.MELD.DWD;
            }
            const splitArray = this.splitCardsArray(currentGroup);
            if (this.checkForPureSequence(splitArray))
                return objectModels_1.MELD.PURE;
            if (this.checkForImpureSequence(splitArray, trumpCard, papluCard))
                return objectModels_1.MELD.SEQUENCE;
            if (this.checkForSets(splitArray, trumpCard, papluCard))
                return objectModels_1.MELD.SET;
            else {
                return objectModels_1.MELD.DWD;
            }
        });
        /**
         * check if there was a pure sequence;
         */
        pureSeqAvailable =
            meld.findIndex((groupName) => groupName === objectModels_1.MELD.PURE) > -1;
        /**
         * set is Valid only
         *  - when there is a pure sequence
         *  - count of pure and impure sequence is greater then or equal to 2
         */
        setValid =
            pureSeqAvailable &&
                meld.reduce((count, groupName) => {
                    count +=
                        groupName === objectModels_1.MELD.SEQUENCE || groupName === objectModels_1.MELD.PURE
                            ? 1
                            : 0;
                    return count;
                }, 0) >= 2;
        // Calculate score based on meld
        score = filteredCards.reduce((lastScore, cardsGroup, index) => {
            if (meld[index] === objectModels_1.MELD.DWD ||
                (meld[index] === objectModels_1.MELD.SET && !setValid) ||
                (meld[index] === objectModels_1.MELD.SEQUENCE && !pureSeqAvailable)) {
                lastScore += this.checkScore(cardsGroup, trumpCard, papluCard);
            }
            return lastScore;
        }, 0);
        score =
            maximumPoints === poolTypes_1.POOL_TYPES.SIXTY_ONE &&
                score > constants_1.POINTS.MAX_DEADWOOD_POINTS_61
                ? constants_1.POINTS.MAX_DEADWOOD_POINTS_61
                : score > constants_1.POINTS.MAX_DEADWOOD_POINTS
                    ? constants_1.POINTS.MAX_DEADWOOD_POINTS
                    : score;
        const meldLabel = this.labelTheMeld({
            meld,
            cardsGroup: filteredCards,
        });
        this.sortGrouping(filteredCards, meldLabel, meld);
        cards.length = 0;
        cards.push(...filteredCards);
        return { meld, score, meldLabel };
    }
    checkScore(cards, trumpCard, papluCard) {
        let score = 0;
        const trumpSplit = trumpCard.split('-');
        if (trumpSplit.length < 3)
            throw new Error(`Invalid trump card at checkScore`);
        const trumpCardNumber = Number(trumpSplit[1]);
        const papluSplit = papluCard ? papluCard.split('-') : null;
        const papluSuit = papluSplit ? papluSplit[0] : undefined;
        const papluRank = papluSplit ? Number(papluSplit[1]) : undefined;
        cards.forEach((card) => {
            score += this.checkCardScore(card, trumpCardNumber, papluSuit, papluRank);
        });
        return score;
    }
    checkCardScore(card, trumpRank, papluSuit, papluRank) {
        const splitCard = card.split('-');
        if (splitCard.length < 3)
            throw new Error(`Invalid card card at checkCardScore`);
        const suit = splitCard[0];
        const rankNum = Number(splitCard[1]);
        // Joker, wild (by rank), or paplu (same suit and next-rank card)
        if (suit === 'J' ||
            trumpRank === rankNum ||
            (papluSuit && papluRank && suit === papluSuit && rankNum === papluRank))
            return 0; // Joker or wild card (including paplu)
        if (rankNum > 10 || rankNum === 1)
            return 10;
        return rankNum;
    }
    checkForSets(splitArray, trumpCard, papluCard) {
        const totalCount = splitArray.length;
        if (totalCount > 4 || totalCount < 3) {
            return false;
        }
        const trump = trumpCard.split('-');
        const trumpRank = Number(trump[1]);
        const pSplit = papluCard ? papluCard.split('-') : null;
        const pSuit = pSplit ? pSplit[0] : undefined;
        const pRank = pSplit ? Number(pSplit[1]) : undefined;
        const cardsWithoutJoWiC = splitArray.filter((card) => !(card.suit === 'J' || card.rank === trumpRank || (pSuit && pRank && card.suit === pSuit && card.rank === pRank)));
        const suitList = cardsWithoutJoWiC.map((card) => card.suit);
        // should not have cards of same suit/ no duplicates in cards
        if (new Set(suitList).size === suitList.length) {
            let isvalid = true;
            // All non-JoWic cards should be of same rank
            for (let i = 0; i < cardsWithoutJoWiC.length - 1; i++) {
                if (cardsWithoutJoWiC[i].rank !== cardsWithoutJoWiC[i + 1].rank) {
                    isvalid = false;
                    break;
                }
            }
            return isvalid;
        }
        else {
            return false;
        }
    }
    checkForPureSequence(split) {
        const [{ suit: cardSuit }] = split;
        // check1: should belong to same suit.
        const sameFamily = split.every((v) => v.suit === cardSuit);
        if (!sameFamily)
            return false;
        // check2: now all cards belongs to same suit, should have no Joker.
        if (cardSuit === 'J')
            return false;
        return this.checkSequentialForPureSequence(split.map((card) => card.rank));
    }
    checkForImpureSequence(splitArray, trumpCard, papluCard) {
        const trumSplit = trumpCard.split('-');
        if (trumSplit.length < 3)
            throw new Error('Invalid trump card!');
        const trumpCardRank = Number(trumpCard.split('-')[1]);
        const papluSplit = papluCard ? papluCard.split('-') : null;
        const papluSuit = papluSplit ? papluSplit[0] : undefined;
        const papluRank = papluSplit ? Number(papluSplit[1]) : undefined;
        const cardList = splitArray.map((indC) => {
            const isPaplu = papluSuit && papluRank && indC.suit === papluSuit && indC.rank === papluRank;
            return {
                rank: indC.rank,
                suit: indC.suit,
                wildorNot: indC.rank === trumpCardRank || !!isPaplu,
            };
        });
        let check = false;
        let check1 = false;
        let check2 = false;
        if (cardList.length <= 2) {
            return false;
        }
        const jokerList = cardList.filter((a) => a.suit === 'J' || a.wildorNot);
        const listCount = cardList.length;
        const jokerListCount = jokerList.length;
        const withouthJokerStringList = [];
        const withouthJokerNumberList = [];
        for (let j = 0; j < listCount; j++) {
            if (cardList[j].suit != 'J' && !cardList[j].wildorNot) {
                withouthJokerStringList.push(cardList[j].suit);
                withouthJokerNumberList.push(cardList[j].rank);
            }
        }
        withouthJokerNumberList.sort((a, b) => a - b);
        //  only joker in the Group
        if (withouthJokerNumberList.length > 0) {
            if (new Set(withouthJokerStringList).size === 1) {
                const [minimumNum] = withouthJokerNumberList;
                const tempJokerListCount = jokerListCount;
                // has Ace card
                if (minimumNum == 1) {
                    // considering A=1
                    check1 = this.checkSeqImpure(withouthJokerNumberList, tempJokerListCount, cardList.length);
                    // if A=1 didn't work make A=14
                    if (!check1) {
                        const tempJokerListCount1 = jokerListCount;
                        let tempCardList = [];
                        let AList = [];
                        tempCardList = withouthJokerNumberList;
                        AList = tempCardList.filter((a) => a === 1);
                        tempCardList = tempCardList.filter((a) => a !== 1);
                        for (let x = 0; x < AList.length; x++) {
                            tempCardList.push(14); // Make Ace 14
                        }
                        check2 = this.checkSeqImpure(tempCardList, tempJokerListCount1, cardList.length);
                    }
                    // A==1 or A==14 which ever worked consider that
                    check = check1 || check2;
                }
                else {
                    check = this.checkSeqImpure(withouthJokerNumberList, tempJokerListCount, cardList.length);
                }
            }
        }
        else {
            const totalCard = withouthJokerNumberList.length + jokerListCount;
            check = totalCard === cardList.length;
        }
        return check;
    }
    // utility for Impure check
    checkSeqImpure(ArrayWithNormalCards, jokerCount, cardListCount) {
        const sizeNormalCards = ArrayWithNormalCards.length;
        let check = false;
        if (sizeNormalCards > 1) {
            for (let i = 0; i < sizeNormalCards - 1; i++) {
                const diff = Math.abs(ArrayWithNormalCards[i] - ArrayWithNormalCards[i + 1]);
                // If difference is one means consecutive cards
                if (diff === 1) {
                    check = true;
                    continue;
                }
                /**
                 * multiple cards of same rank or not
                 * or
                 * Joker or trump cards insufficient or  exhausted/finished
                 */
                if (diff <= 0 || jokerCount < 1 || diff - 1 > jokerCount) {
                    check = false;
                    break;
                }
                jokerCount = jokerCount - (diff - 1);
                check = true;
            }
        }
        else {
            const totalCard = sizeNormalCards + jokerCount;
            check = totalCard === cardListCount;
        }
        return check;
    }
    splitCardsArray(cards) {
        const splitArray = [];
        cards.forEach((currentCard) => {
            const currentSplit = currentCard.split('-');
            if (currentSplit.length < 3)
                throw new Error(`Invalid card sequence in splitCardArray`);
            splitArray.push({
                suit: currentSplit[0],
                deck: Number(currentSplit[2]),
                rank: Number(currentSplit[1]),
            });
        });
        return splitArray;
    }
    checkSequentialForPureSequence(nums) {
        let cards = [...nums];
        const groupSize = cards.length - 1;
        cards.sort((a, b) => a - b);
        const [firstCard] = cards;
        // let startTurn = NUMERICAL.ONE;
        let allSequenced = true;
        // card contains ace
        if (firstCard === constants_1.NUMERICAL.ONE) {
            // either the second card should be two or last card should be king
            if (cards[1] !== constants_1.NUMERICAL.TWO &&
                cards[groupSize] !== constants_1.NUMERICAL.THIRTEEN) {
                return false;
            }
            else if (cards[groupSize] === constants_1.NUMERICAL.THIRTEEN) {
                // If king is present then make Ace 14th card.
                const [, ...restOfTheCrads] = cards;
                cards = [...restOfTheCrads, constants_1.NUMERICAL.FOURTEEN];
            }
        }
        for (let i = 0; i < groupSize; i++) {
            if (Math.abs(cards[i + 1] - cards[i]) !== 1) {
                allSequenced = false;
                break;
            }
        }
        return allSequenced;
    }
    initialCardsGrouping(cards) {
        const Sp = [];
        const clb = [];
        const hrt = [];
        const dmd = [];
        const Jok = [];
        cards.forEach((card) => {
            const [firstChar] = card;
            switch (firstChar) {
                case 'S':
                    Sp.push(card);
                    break;
                case 'D':
                    dmd.push(card);
                    break;
                case 'C':
                    clb.push(card);
                    break;
                case 'H':
                    hrt.push(card);
                    break;
                default:
                    Jok.push(card);
                    break;
            }
        });
        return [hrt, dmd, clb, Sp, Jok]
            .filter((group) => {
            return group.length > 0;
        })
            .map((group) => {
            return group.sort((a, b) => {
                return Number(a.split('-')[1]) - Number(b.split('-')[1]);
            });
        });
    }
    sortGrouping(group, meldLabel, meld) {
        newLogger_1.Logger.info('unsorted group', [group, meldLabel, meld]);
        const priority = {
            FirstLife: 1,
            SecondLife: 2,
            Pure: 3,
            Impure: 4,
            Set: 5,
            FirstLifeNeeded: 6,
            SecondLifeNeeded: 7,
            Invalid: 8,
            None: 9,
        };
        const newGroup = [];
        meldLabel.forEach((data, index) => {
            newGroup.push([group[index], data, meld[index]]);
        });
        newGroup.sort((gA, gB) => {
            return priority[gA[1]] - priority[gB[1]];
        });
        group.length = 0;
        meldLabel.length = 0;
        meld.length = 0;
        newGroup.forEach((element) => {
            const [grouping, label, meldValue] = element;
            group.push(grouping);
            meldLabel.push(label);
            meld.push(meldValue);
        });
        newLogger_1.Logger.info('sorted group', [group, meldLabel, meld]);
    }
    chooseCardsForDealerToss(seats) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const cards = (0, suffleCard_1.shuffleCards)([...constants_1.TOSS_CARDS]);
            const tossCards = [];
            const usersTossCardObj = [];
            for (const i in seats) {
                if ((_a = seats[i]) === null || _a === void 0 ? void 0 : _a._id) {
                    const tCard = cards[i];
                    tossCards.push(tCard);
                    usersTossCardObj.push({
                        userId: seats[i]._id,
                        seatIndex: seats[i].seat,
                        tossCard: tCard,
                    });
                }
            }
            const highCard = this.getHighCard(tossCards);
            usersTossCardObj.forEach((userTossCard) => {
                if (highCard === userTossCard.tossCard) {
                    userTossCard.tossWinner = true;
                }
            });
            return usersTossCardObj;
        });
    }
    getHighCard(cards) {
        let highCard = cards[0]; // by default high card will be the first card
        let highCardSplitArr = highCard.split('-');
        for (let i = 1; i < cards.length; i++) {
            const tempCardSplitArr = cards[i].split('-');
            if ((parseInt(highCardSplitArr[1]) <
                parseInt(tempCardSplitArr[1]) &&
                parseInt(highCardSplitArr[1]) !== 1) ||
                parseInt(tempCardSplitArr[1]) === 1) {
                //low rank
                highCardSplitArr = tempCardSplitArr;
            }
        }
        highCard = highCardSplitArr.join('-');
        return highCard;
    }
    declareCard(data, socket, networkParams) {
        return __awaiter(this, void 0, void 0, function* () {
            let lock;
            try {
                const { tableId, card, group } = data;
                lock = yield redlock_2.redlock.Lock.acquire([`lock:${tableId}`], 2000);
                newLogger_1.Logger.info(`Lock acquired, in declareCard resource:, ${lock.resource}`);
                let currentCardsGroup = group;
                let isValid = true;
                const { userId } = socket;
                const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, ['_id',
                    'userFinishTimer',
                    'currentRound',
                    'gameType',
                    'maximumPoints']);
                const { currentRound } = tableConfigData;
                const [playerGameplayData, tableGameplayData, currentRoundHistory,] = yield Promise.all([
                    playerGameplay_1.playerGameplayService.getPlayerGameplay(userId, tableId, currentRound, ["userStatus",
                        "currentCards",
                        "groupingCards"]),
                    tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, ['declarePlayer',
                        'seats',
                        'closedDeck',
                        'trumpCard',
                        'opendDeck',
                        'tableState',
                        'declarePlayer',
                        'currentTurn']),
                    turnHistory_1.turnHistoryService.getTurnHistory(tableId, currentRound),
                ]);
                if (!playerGameplayData || !tableGameplayData) {
                    throw new Error(`TGP or PGP not found table: ${tableId}-${currentRound}, userId: ${userId} from declareCard`);
                }
                if (!(tableGameplayData.currentTurn === userId &&
                    playerGameplayData.currentCards.length === 14 &&
                    playerGameplayData.userStatus === constants_1.PLAYER_STATE.PLAYING)) {
                    newLogger_1.Logger.error("INTERNAL_SERVER_ERROR Client doesn't have 14 cards", [
                        tableId,
                        tableGameplayData,
                        playerGameplayData,
                    ]);
                    throw new Error(`INTERNAL_SERVER_ERROR Client doesn't have 14 cards`);
                }
                // // cancel player turn timer
                // await scheduler.cancelJob.playerTurnTimer(tableId, userId);
                // logic to pick and drop should come here
                // remove card from current deck
                if (playerGameplayData.currentCards.indexOf(card) === -1) {
                    // no such card in the player's deck
                    throw new Error(`Invalid card`);
                }
                playerGameplayData.currentCards = cards_1.cardUtils.removeCardFromDeck(playerGameplayData.currentCards, card);
                if (!(0, utils_1.issGroupingCardAndCurrentCardSame)([...playerGameplayData.currentCards], currentCardsGroup)) {
                    isValid = false;
                    currentCardsGroup = playerGameplayData.groupingCards;
                }
                currentCardsGroup = (0, utils_1.removePickCardFromCards)(card, currentCardsGroup);
                newLogger_1.Logger.info(`currentCards: `, [
                    playerGameplayData.currentCards,
                    `${isValid} >> currentCardsGroup >> `,
                    currentCardsGroup,
                    tableId,
                    playerGameplayData.userStatus,
                ]);
                const { score, meld, meldLabel } = this.groupCardsOnMeld([...currentCardsGroup], tableGameplayData.trumpCard, tableConfigData.maximumPoints);
                playerGameplayData.groupingCards = currentCardsGroup;
                playerGameplayData.meld = meld;
                // if (score != 0 && cardUtils.areSequencesValid(meld)) {
                //   // invalid declare
                //   return {
                //     tableId,
                //     score,
                //     meld: meldLabel,
                //     group: currentCardsGroup,
                //     isValid,
                //   };
                // }
                // cancel player turn timer
                yield index_2.scheduler.cancelJob.playerTurnTimer(tableId, userId);
                playerGameplayData.userStatus = constants_1.PLAYER_STATE.DECLARED;
                // Update TGP
                tableGameplayData.opendDeck.push(card);
                tableGameplayData.tableState = constants_1.TABLE_STATE.DECLARED;
                tableGameplayData.declarePlayer = userId;
                // Round history save
                const currentRoundIndex = currentRoundHistory.turnsDetails.length - 1;
                currentRoundHistory.turnsDetails[currentRoundIndex].turnStatus =
                    constants_2.TURN_HISTORY.INVALID_DECLARE;
                currentRoundHistory.turnsDetails[currentRoundIndex].cardDiscarded = card;
                currentRoundHistory.turnsDetails[currentRoundIndex].points =
                    score;
                currentRoundHistory.turnsDetails[currentRoundIndex].endState =
                    (0, utils_1.removeEmptyString)(currentCardsGroup.toString().replace(/,*$/, ''));
                currentRoundHistory.turnsDetails[currentRoundIndex].sortedEndState = (0, turnHistory_2.sortedCards)(currentCardsGroup, meld);
                if (networkParams) {
                    playerGameplayData.networkParams = networkParams;
                }
                yield Promise.all([
                    playerGameplay_1.playerGameplayService.setPlayerGameplay(userId, tableId, currentRound, playerGameplayData),
                    tableGameplay_1.tableGameplayService.setTableGameplay(tableId, currentRound, tableGameplayData),
                    turnHistory_1.turnHistoryService.setTurnHistory(tableId, currentRound, currentRoundHistory),
                    events_2.eventStateManager.fireEvent(tableId, events_1.STATE_EVENTS.DECLARE),
                ]);
                // send event to room
                const declareData = {
                    tableId,
                    userId,
                    card,
                    message: ``,
                };
                yield socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.DECLARE_CARD, declareData);
                // const activePlayerSeatIndex = tableGameplayData.seats.map(
                //     (e) => e.userId,
                // );
                const pgps = yield Promise.all(tableGameplayData.seats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, currentRound, ["userStatus"])));
                const playersGameData = [];
                pgps.forEach((pgp) => __awaiter(this, void 0, void 0, function* () {
                    if (pgp) {
                        playersGameData.push(pgp);
                        yield events_2.eventStateManager.fireEventUser(tableId, userId, events_1.USER_EVENTS.DECLARE, (networkParams === null || networkParams === void 0 ? void 0 : networkParams.timeStamp) ||
                            date_1.dateUtils.getCurrentEpochTime());
                    }
                }));
                yield declareCard_1.declareCardEvent.scheduleFinishTimer(tableConfigData, tableGameplayData, playersGameData);
                return {
                    tableId,
                    score,
                    meld: meldLabel,
                    group: playerGameplayData.groupingCards,
                    isValid,
                };
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR cardHandlerDeclareCard ', [error]);
                if (error instanceof index_1.CancelBattleError) {
                    yield cancelBattle_1.cancelBattle.cancelBattle(data.tableId, error);
                }
                throw error;
            }
            finally {
                try {
                    if (lock && lock instanceof redlock_1.Lock) {
                        yield redlock_2.redlock.Lock.release(lock);
                        newLogger_1.Logger.info(`Lock releasing, in declareCard; resource:, ${lock.resource}`);
                    }
                }
                catch (err) {
                    newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error While releasing lock on declareCard: ${err}`, [err]);
                }
            }
        });
    }
    /**
     * To show all open discarded cards(open deck cards with userIds)
     */
    discardedCards(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!tableId) {
                    throw new Error(`data missing on discardedCards ${tableId}`);
                }
                const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, ['currentRound']);
                const { currentRound } = tableConfigData;
                const openDiscardedCardsData = yield tableGameplay_1.tableGameplayService.getOpenDiscardedCards(tableId, currentRound);
                if (!(openDiscardedCardsData === null || openDiscardedCardsData === void 0 ? void 0 : openDiscardedCardsData.openCards)) {
                    throw new Error(`discarded cards not found ${tableId}-${currentRound}`);
                }
                const { openCards } = openDiscardedCardsData;
                const ackResponse = {
                    tableId,
                    openCards: openCards.reverse(),
                };
                return ackResponse;
            }
            catch (error) {
                newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR Error found on discadedCard ${tableId},
        error: ${error.message}`, [error]);
                return {
                    message: 'This data is not available!',
                };
            }
        });
    }
}
exports.cardHandler = new CardHandler();
