"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openDiscardedCardsValidator = exports.playerGameplayValidator = exports.userProfileValidator = exports.tableGameplayValidator = void 0;
const joi_1 = __importDefault(require("joi"));
const newLogger_1 = require("../newLogger");
const doubleDeck_1 = require("../constants/doubleDeck");
const playerState_1 = require("../constants/playerState");
const tableState_1 = require("../constants/tableState");
function tableGameplayValidator(tableGameplayData) {
    try {
        joi_1.default.assert(tableGameplayData, joi_1.default.object().keys({
            _id: joi_1.default.string().description('unique object id'),
            closedDeck: joi_1.default.array()
                .items(joi_1.default.string())
                .default([])
                .description('game play closed deck/cards')
                .required(),
            noOfPlayers: joi_1.default.number()
                .integer()
                .greater(-1)
                .default(0)
                .description('number of players')
                .required(),
            currentTurn: joi_1.default.number()
                .allow(null)
                .description('player who has current turn, refrence taken from userProfile playerId field ')
                .required(),
            declarePlayer: joi_1.default.number()
                .allow(null)
                .description('declare player, refrence taken from userProfile playerId field '),
            opendDeck: joi_1.default.array()
                .items(joi_1.default.string())
                .default([])
                .description('game play opend deck/cards')
                .required(),
            potValue: joi_1.default.number()
                .greater(-1)
                .default(0)
                .allow(null)
                .description('entry fees'),
            pointsForRoundWinner: joi_1.default.number()
                .default(0)
                .description('points stored for round winner ')
                .required(),
            roundNumber: joi_1.default.number()
                .allow(null, 1)
                .description('round number of the game '),
            seats: joi_1.default.array()
                .default([])
                .description('seats defining seat indexes')
                .required(),
            tableState: joi_1.default.string()
                .default(tableState_1.TABLE_STATE.WAITING_FOR_PLAYERS)
                .valid(tableState_1.TABLE_STATE.WAITING_FOR_PLAYERS, tableState_1.TABLE_STATE.ROUND_TIMER_STARTED, tableState_1.TABLE_STATE.LOCK_IN_PERIOD, tableState_1.TABLE_STATE.COLLECTING_BOOT_VALUE, tableState_1.TABLE_STATE.CARDS_DEALT, tableState_1.TABLE_STATE.ROUND_STARTED, tableState_1.TABLE_STATE.DECLARED, tableState_1.TABLE_STATE.ROUND_WINNER_DECLARED, tableState_1.TABLE_STATE.WINNER_DECLARED, tableState_1.TABLE_STATE.PLAY_MORE, tableState_1.TABLE_STATE.WINNER_DECLARED_TIE)
                .description('table state')
                .required(),
            trumpCard: joi_1.default.string()
                .allow(null, '')
                .description('wild card')
                .valid(...doubleDeck_1.DOUBLE_DECK)
                .required(),
            dealerPlayer: joi_1.default.number()
                .allow(null)
                .description('dealer player, refrence taken from userProfile playerId field ')
                .required(),
            finishPlayer: joi_1.default.array()
                .items(joi_1.default.number().description('playerId'))
                .default([])
                .description(' , refrence taken from userProfile playerId field ')
                .required(),
            splitCount: joi_1.default.number()
                .integer()
                .greater(-1)
                .default(0)
                .description('split count'),
            splitUserId: joi_1.default.number()
                .allow(null)
                .description('split user id'),
            tie: joi_1.default.boolean()
                .default(false)
                .description('table game play has been tie'),
            totalPlayerPoints: joi_1.default.number()
                .integer()
                .greater(-1)
                .default(0)
                .description('total player points'),
            turnCount: joi_1.default.number()
                .integer()
                .greater(-1)
                .default(0)
                .description('turn count')
                .required(),
            tableCurrentTimer: joi_1.default.string()
                .allow(null, '')
                .description('table current timer')
                .required(),
            rebuyableUsers: joi_1.default.array()
                .items(joi_1.default.number())
                .default([])
                .description('rebuyable users')
                .optional(),
            standupUsers: joi_1.default.array()
                .default([])
                .description('standup/audience users')
                .optional(),
            randomWinTurn: joi_1.default.number().default(0).optional(),
            botWinningChecked: joi_1.default.boolean().default(false).optional(),
            botTurnCount: joi_1.default.number().default(0).optional(),
            isRebuyable: joi_1.default.boolean()
                .default(false)
                .description('table game play is rebuyable'),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at tableGameplay req validation for `, [tableGameplayData, error]);
        throw new Error(error);
    }
}
exports.tableGameplayValidator = tableGameplayValidator;
function userProfileValidator(userProfileData) {
    try {
        joi_1.default.assert(userProfileData, joi_1.default.object()
            .keys({
            id: joi_1.default.number()
                .description('user id of the user')
                .required(),
            displayName: joi_1.default.string()
                .description('display name for the user')
                .allow(null)
                .required(),
            avatarUrl: joi_1.default.string()
                .description('profile picture of the user')
                .allow(null)
                .required(),
            userName: joi_1.default.string()
                .allow(null)
                .description('user name of ther user')
                .required(),
            isPrime: joi_1.default.boolean().default(false).required(),
            socketId: joi_1.default.string()
                .description('socket id for the user ')
                .required(),
            tableIds: joi_1.default.array()
                .items(joi_1.default.string())
                .default([])
                .description('table ids for a user')
                .required(),
            tenant: joi_1.default.string()
                .description('tenant of the user')
                .allow(null)
                .required(),
            userTablesCash: joi_1.default.array()
                .default([])
                .description('user cash details as per tables')
                .required(),
        })
            .unknown(true));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at userProfileValidator req validation for `, [userProfileData, error]);
        throw new Error(error);
    }
}
exports.userProfileValidator = userProfileValidator;
function playerGameplayValidator(playerGameplayData) {
    try {
        joi_1.default.assert(playerGameplayData, joi_1.default.object().keys({
            userId: joi_1.default.number()
                .description('user id of the user')
                .required(),
            currentCards: joi_1.default.array()
                .default([])
                .description('player current cards')
                .required(),
            groupingCards: joi_1.default.array()
                .items(joi_1.default.array())
                .default([])
                .description('table ids for a user')
                .required(),
            meld: joi_1.default.array()
                .items(joi_1.default.string())
                .default([])
                .description('table ids for a user')
                .required(),
            lastPickCard: joi_1.default.string()
                .allow('')
                .default('')
                .description('last card pick count')
                .required(),
            pickCount: joi_1.default.number()
                .integer()
                .greater(-1)
                .default(0)
                .description('card pick count')
                .required(),
            points: joi_1.default.number()
                .integer()
                .greater(-1)
                .default(0)
                .description('point to be multiplied with bootvalue')
                .required(),
            rank: joi_1.default.number()
                .integer()
                .greater(-1)
                .default(0)
                .description('rank')
                .required(),
            seatIndex: joi_1.default.number()
                .integer()
                .greater(-1)
                .description('seat Index')
                .required(),
            userStatus: joi_1.default.string()
                .valid(playerState_1.PLAYER_STATE.DROP, playerState_1.PLAYER_STATE.FINISH, playerState_1.PLAYER_STATE.LEFT, playerState_1.PLAYER_STATE.LOST, playerState_1.PLAYER_STATE.PLAYING, playerState_1.PLAYER_STATE.WON, playerState_1.PLAYER_STATE.DECLARED, playerState_1.PLAYER_STATE.PLAY_MORE)
                .description('player status')
                .required(),
            dealPoint: joi_1.default.number()
                .integer()
                .default(0)
                .description('dp')
                .required(),
            invalidDeclare: joi_1.default.boolean()
                .default(false)
                .description('invalide declare status'),
            isFirstTurn: joi_1.default.boolean()
                .default(false)
                .description('player has first turn in a table')
                .required(),
            split: joi_1.default.number()
                .default(2)
                .description('split 0 is reject, 1 is accept, 2 is neither of two')
                .required(),
            turnCount: joi_1.default.number()
                .integer()
                .greater(-1)
                .default(0)
                .description('timeout count')
                .required(),
            timeoutCount: joi_1.default.number()
                .integer()
                .greater(-1)
                .default(0)
                .description('player turn timeout')
                .required(),
            useRebuy: joi_1.default.boolean()
                .default(false)
                .description('useRebuy for the player')
                .optional(),
            networkParams: joi_1.default.object(),
            winningCash: joi_1.default.number()
                .default(0)
                .description('winning cash amount'),
            isPlayAgain: joi_1.default.boolean()
                .default(true)
                .description('user canPlayAgain after round completion')
                .optional(),
            pointRummyAutoDebit: joi_1.default.object()
                .description('auto bebit amount')
                .optional(),
            tableSessionId: joi_1.default.string()
                .default('')
                .allow('')
                .description('tableSessionId getting from unity side')
                .optional(),
            gameEndReason: joi_1.default.string()
                .default('')
                .description('gameEndReason to be passed to CGS')
                .optional(),
            isAutoDrop: joi_1.default.boolean()
                .default(false)
                .description('auto drop feature'),
            isAutoDropSwitch: joi_1.default.boolean()
                .default(false)
                .description('auto drop switch feature')
                .optional(),
            isNewUI: joi_1.default.boolean(),
            isBotWinner: joi_1.default.boolean()
                .default(false)
                .description('isBotWinner ')
                .optional(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at playerGameplayValidator req validation for `, [playerGameplayData, error]);
        throw new Error(error);
    }
}
exports.playerGameplayValidator = playerGameplayValidator;
function openDiscardedCardsValidator(OpenDiscardedCardsData) {
    try {
        joi_1.default.assert(OpenDiscardedCardsData, joi_1.default.object().keys({
            openCards: joi_1.default.array()
                .items(joi_1.default.object()
                .keys({
                userId: joi_1.default.number()
                    .description('user id of the user')
                    .required(),
                card: joi_1.default.string()
                    .valid(...doubleDeck_1.DOUBLE_DECK)
                    .description('throw card')
                    .required(),
            })
                .unknown(true))
                .description('discarded cards with userId')
                .required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at OpenDiscardedCards req validation for `, [OpenDiscardedCardsData, error]);
        throw new Error(error);
    }
}
exports.openDiscardedCardsValidator = openDiscardedCardsValidator;
