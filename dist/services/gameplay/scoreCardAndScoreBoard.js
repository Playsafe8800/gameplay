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
exports.getLastRoundScoreBoard = exports.getLastRoundScoreCard = void 0;
const newLogger_1 = require("../../newLogger");
const roundScoreCard_1 = require("../../db/roundScoreCard");
const roundScoreBoard_1 = require("../../db/roundScoreBoard");
const request_validator_1 = require("../../validators/request.validator");
const response_validator_1 = require("../../validators/response.validator");
const tableConfiguration_1 = require("../../db/tableConfiguration");
/**
 * get last all rounds player points
 * player scores card
 */
const getLastRoundScoreCard = (data, socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, request_validator_1.validateLastRoundScoreCardReq)(data);
        const { tableId } = data;
        const scoresCardData = yield roundScoreCard_1.roundScoreCardService.getRoundScoreCard(tableId);
        const responseObj = {
            tableId,
            scoreDataList: scoresCardData,
        };
        (0, response_validator_1.validateLastRoundScoreCardRes)(responseObj);
        return responseObj;
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR getLastRoundScoresCard: tableId: ${data === null || data === void 0 ? void 0 : data.tableId} userId: ${socket === null || socket === void 0 ? void 0 : socket.userId}`, [error]);
        return {
            message: 'Scorecard data is not available!',
        };
    }
});
exports.getLastRoundScoreCard = getLastRoundScoreCard;
/**
 * get last round winner score board
 */
const getLastRoundScoreBoard = (data, socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, request_validator_1.validateLastRoundScoreCardReq)(data);
        const { tableId } = data;
        let { round } = data;
        if (!round) {
            const tableConfigData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, ['currentRound']);
            round = (tableConfigData === null || tableConfigData === void 0 ? void 0 : tableConfigData.currentRound)
                ? (tableConfigData === null || tableConfigData === void 0 ? void 0 : tableConfigData.currentRound) - 1
                : 1;
        }
        const roundScoreBoard = yield roundScoreBoard_1.roundScoreBoardService.getRoundScoreBoard(tableId, round);
        newLogger_1.Logger.info('-----roundScoreBoard---', [
            roundScoreBoard,
            tableId,
        ]);
        if (roundScoreBoard)
            roundScoreBoard.round = round;
        (0, response_validator_1.validateLastRoundScoreBoardRes)(roundScoreBoard);
        return roundScoreBoard;
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR getLastRoundScoreBoard: tableId: ${data === null || data === void 0 ? void 0 : data.tableId} userId: ${socket === null || socket === void 0 ? void 0 : socket.userId}`, [error]);
        return {
            message: 'This round data is not available!',
        };
    }
});
exports.getLastRoundScoreBoard = getLastRoundScoreBoard;
