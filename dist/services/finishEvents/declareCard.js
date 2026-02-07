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
exports.declareCardEvent = void 0;
const newLogger_1 = require("../../newLogger");
const playerState_1 = require("../../constants/playerState");
const index_1 = require("../schedulerQueue/index");
const underscore_1 = __importDefault(require("underscore"));
const numerical_1 = require("../../constants/numerical");
const index_2 = require("../../db/tableGameplay/index");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const events_1 = require("../../constants/events");
const date_1 = require("../../utils/date");
const playerGameplay_1 = require("../../db/playerGameplay");
const userProfile_1 = require("../../db/userProfile");
const getSequence_1 = __importDefault(require("../rebuy/getSequence"));
class DeclareCard {
    scheduleFinishTimer(tableData, tableGameData, playersGameData, forOthers = false) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(`scheduleFinishTimer: ${tableData._id}`, [
                tableData,
                tableGameData,
                playersGameData,
                forOthers,
            ]);
            const { _id: tableId, userFinishTimer, currentRound } = tableData;
            const { declarePlayer, seats } = tableGameData;
            const playingUsers = seats.filter((seat, i) => playersGameData[i] &&
                playersGameData[i].userStatus === playerState_1.PLAYER_STATE.PLAYING);
            let usersObjectIds = playingUsers.map((seat) => seat._id);
            if (declarePlayer !== null) {
                usersObjectIds = forOthers
                    ? underscore_1.default.without(usersObjectIds, declarePlayer)
                    : [declarePlayer];
            }
            const newTableGamePlay = Object.assign({}, tableGameData);
            const currentTime = new Date();
            newTableGamePlay.tableCurrentTimer = new Date(currentTime.setSeconds(currentTime.getSeconds() + Number(userFinishTimer))).toISOString();
            const finishData = {
                tableId,
                userIds: usersObjectIds,
                timer: date_1.dateUtils.addEpochTimeInSeconds(userFinishTimer),
            };
            const userProfiles = yield Promise.all(usersObjectIds.map((e) => userProfile_1.userProfileService.getUserDetailsById(e)));
            userProfiles.forEach((userDetail) => __awaiter(this, void 0, void 0, function* () {
                if (userDetail && userDetail.isBot) {
                    const ran = Math.floor(Math.random() * (numerical_1.NUMERICAL.SIX - numerical_1.NUMERICAL.TWO + 1) +
                        numerical_1.NUMERICAL.TWO);
                    const findPgp = yield playerGameplay_1.playerGameplayService.getPlayerGameplay(userDetail.id, tableId, currentRound, ['groupingCards', 'userId']);
                    if (findPgp) {
                        yield index_1.scheduler.addJob.botFinish(tableId, findPgp.userId, ran * numerical_1.NUMERICAL.THOUSAND, findPgp.groupingCards);
                    }
                }
            }));
            yield Promise.all([
                index_2.tableGameplayService.setTableGameplay(tableId, tableData.currentRound, newTableGamePlay),
                index_1.scheduler.addJob.finishTimer(tableId, currentRound, usersObjectIds, userFinishTimer * numerical_1.NUMERICAL.THOUSAND, forOthers),
                socketOperation_1.socketOperation.sendEventToRoom(tableId, events_1.EVENTS.FINISH_TIMER, finishData),
            ]);
        });
    }
    getRandomCardFromDeck(deck) {
        const randomIndex = Math.floor(Math.random() * deck.length);
        return deck[randomIndex];
    }
    groupCardOpponat(currentCard, trumpCard) {
        const validSequences = new getSequence_1.default(currentCard, trumpCard);
        const { pureSeq, impureSeq, closedDeck, oldClosedDeck } = validSequences.getPureImpureSeq();
        const removeCardsFromDeck = (sequence) => {
            sequence.forEach((seq) => {
                seq.forEach((card) => {
                    const index = oldClosedDeck.indexOf(card);
                    if (index !== -1) {
                        oldClosedDeck.splice(index, 1);
                    }
                });
            });
        };
        let finalCards = [];
        const deadWood = [];
        const fourCards = [];
        const threeCards = [];
        for (let i = 0; i < pureSeq.length; i++) {
            const singleGroup = pureSeq[i];
            singleGroup.length === 4
                ? fourCards.push(singleGroup)
                : threeCards.push(singleGroup);
        }
        let isFour = false;
        let isThree = false;
        let isImpure = false;
        if (fourCards.length >= 1)
            isFour = true;
        if (threeCards.length >= 3)
            isThree = true;
        if (impureSeq.length >= 1)
            isImpure = true;
        if (isFour && isThree && isImpure) {
            // eslint-disable-next-line prefer-destructuring
            const impureFirst = impureSeq[0];
            impureFirst.shift();
            impureFirst.push(this.getRandomCardFromDeck(closedDeck));
            finalCards.push(impureFirst);
            finalCards.push(fourCards[0]);
            if (threeCards.length >= 3) {
                finalCards.push(...[threeCards[0], threeCards[1]]);
            }
        }
        else if (!isFour && isThree && isImpure) {
            finalCards.push(...[threeCards[0], threeCards[1], threeCards[2]]);
            finalCards.push(impureSeq[0]);
            deadWood.push(this.getRandomCardFromDeck(closedDeck));
        }
        else if (isFour && !isThree && isImpure) {
            finalCards.push(fourCards[0]);
            // eslint-disable-next-line prefer-destructuring
            const impureFirst = impureSeq[0];
            impureFirst.shift();
            impureFirst.push(this.getRandomCardFromDeck(closedDeck));
            finalCards.push(impureFirst);
            for (let i = 1; i < impureSeq.length; i++) {
                if (finalCards.length !== 4) {
                    finalCards.push(impureSeq[i]);
                    continue;
                }
                break;
            }
        }
        else if (isFour && isThree && !isImpure) {
            finalCards.push(...[threeCards[0], threeCards[1], threeCards[2]]);
            // eslint-disable-next-line prefer-destructuring
            const changedFour = fourCards[0];
            changedFour.shift();
            deadWood.push(this.getRandomCardFromDeck(closedDeck));
            finalCards.push(changedFour);
        }
        else if (!isFour && !isThree && isImpure) {
            for (let i = 0; i < impureSeq.length; i++) {
                if (finalCards.length !== 4) {
                    finalCards.push(impureSeq[i]);
                    continue;
                }
                break;
            }
            if (finalCards.length !== 4 && threeCards.length) {
                for (let i = 0; i < threeCards.length; i++) {
                    if (finalCards.length !== 4) {
                        finalCards.push(threeCards[i]);
                        continue;
                    }
                    break;
                }
            }
            deadWood.push(this.getRandomCardFromDeck(closedDeck));
        }
        else if (isFour && !isThree && !isImpure) {
            newLogger_1.Logger.error('INTERNAL_SERVER_ERROR Not possible ....', [currentCard, trumpCard]);
        }
        else if (!isFour && isThree && !isImpure) {
            finalCards.push(...[threeCards[0], threeCards[1], threeCards[2]]);
            deadWood.push(this.getRandomCardFromDeck(closedDeck));
            if (threeCards.length >= 4) {
                finalCards.push(threeCards[3]);
            }
            else {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR Not possible ....', [currentCard, trumpCard]);
            }
        }
        if (deadWood.length)
            finalCards.push(deadWood);
        const currentCards = finalCards.flat().filter((e) => e);
        if (currentCards.length !== 13) {
            removeCardsFromDeck([currentCards]);
            const filteredCards = [];
            for (let i = 0; i < finalCards.length; i++) {
                const element = finalCards[i];
                const singleGroup = [];
                for (let j = 0; j < element.length; j++) {
                    if (element[j]) {
                        singleGroup.push(element[j]);
                    }
                    else {
                        singleGroup.push(this.getRandomCardFromDeck(oldClosedDeck));
                    }
                }
                filteredCards.push(singleGroup);
            }
            finalCards = filteredCards;
        }
        return finalCards;
    }
}
exports.declareCardEvent = new DeclareCard();
