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
exports.AutomationSuite = void 0;
const newLogger_1 = require("../../newLogger");
const fs_1 = __importDefault(require("fs"));
class AutomationSuite {
    distributeCardsForAutomationSuite(gameType, playersData) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info('Distributing cards from cardsToBeDealt.json');
            const usersCards = [];
            let cardData;
            // playerIds -> [123, 456] (sorted order)
            // normalizedString will be of the following format "123,456,"
            const testCaseKey = this.generateNormalizedUserList(playersData);
            return new Promise((resolve, reject) => {
                fs_1.default.readFile('./cardsToBeDealt.json', (error, data) => {
                    if (error) {
                        reject(`Error reading cards from JSON file: ${error}`);
                    }
                    const cardDataJSON = JSON.parse(data.toString());
                    newLogger_1.Logger.info('GameType: ', gameType);
                    newLogger_1.Logger.info('testCaseKey: ', testCaseKey);
                    cardData = cardDataJSON[`${gameType}`][`${testCaseKey}`];
                    newLogger_1.Logger.info('Dealing the cards: ', cardData);
                    // setting cards for each player
                    for (let i = 0; i < playersData.length; ++i) {
                        const playerId = playersData[i].id;
                        usersCards.push(cardData.usersCards[`${playerId}`]);
                    }
                    const distributedCards = {
                        usersCards,
                        wildCard: cardData.wildCard,
                        firstOpenCard: cardData.firstOpenCard,
                        shuffledDeck: cardData.shuffledDeck,
                    };
                    resolve(distributedCards);
                });
            });
        });
    }
    generateNormalizedUserList(playersData) {
        let normalizedString = '';
        const playerIdArray = [];
        playersData.forEach((player) => {
            playerIdArray.push(player.id);
        });
        playerIdArray.sort();
        playerIdArray.forEach((id) => {
            normalizedString += `${id},`;
        });
        return normalizedString;
    }
}
exports.AutomationSuite = AutomationSuite;
