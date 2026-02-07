"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStandupRoomRes = exports.validateRebuyActionRes = exports.validateLastRoundScoreBoardRes = exports.validateLastRoundScoreCardRes = exports.validateDropCardRoomPointsRes = exports.validateDropCardRoomRes = exports.validateThrowCardRoomRes = exports.validateThrowCardAckRes = exports.validatePickCardRoomRes = exports.validatePickCardAckRes = void 0;
const joi_1 = __importDefault(require("joi"));
const newLogger_1 = require("../newLogger");
const constants_1 = require("../constants");
function validatePickCardAckRes(pickCardData) {
    try {
        joi_1.default.assert(pickCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            card: joi_1.default.string().required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at pickCardAck res validation for `, [pickCardData, error]);
        throw new Error(error);
    }
}
exports.validatePickCardAckRes = validatePickCardAckRes;
function validatePickCardRoomRes(pickCardData) {
    try {
        joi_1.default.assert(pickCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            userId: joi_1.default.number().required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at pickCardRoom res validation for `, [pickCardData, error]);
        throw new Error(error);
    }
}
exports.validatePickCardRoomRes = validatePickCardRoomRes;
function validateThrowCardAckRes(throwCardData) {
    try {
        joi_1.default.assert(throwCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            score: joi_1.default.number().required(),
            meld: joi_1.default.array().items(joi_1.default.string().required()),
            group: joi_1.default.array().items(joi_1.default.array().items(joi_1.default.string().optional())),
            isValid: joi_1.default.boolean().required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at validateThrowCardAckRes res validation for `, [throwCardData, error]);
        throw new Error(error);
    }
}
exports.validateThrowCardAckRes = validateThrowCardAckRes;
function validateThrowCardRoomRes(throwCardData) {
    try {
        joi_1.default.assert(throwCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            userId: joi_1.default.number().required(),
            card: joi_1.default.string().required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at validateThrowCardRoomRes res validation for `, [throwCardData, error]);
        throw new Error(error);
    }
}
exports.validateThrowCardRoomRes = validateThrowCardRoomRes;
function validateDropCardRoomRes(dropCardData) {
    try {
        joi_1.default.assert(dropCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            userId: joi_1.default.number().required(),
            totalPoints: joi_1.default.number().required(),
            status: joi_1.default.string().required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at dropCardRoom res validation for `, [dropCardData, error]);
        throw new Error(error);
    }
}
exports.validateDropCardRoomRes = validateDropCardRoomRes;
function validateDropCardRoomPointsRes(dropCardData) {
    try {
        joi_1.default.assert(dropCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            userId: joi_1.default.number().required(),
            totalPoints: joi_1.default.number().required(),
            status: joi_1.default.string().required(),
            potValue: joi_1.default.number().required(),
            winningCash: joi_1.default.number().required(),
            userCash: joi_1.default.number().required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at dropCardRoom res validation for `, [dropCardData, error]);
        throw new Error(error);
    }
}
exports.validateDropCardRoomPointsRes = validateDropCardRoomPointsRes;
function validateLastRoundScoreCardRes(roundScoreCardData) {
    try {
        const scoreCardSchema = joi_1.default.object({
            tableId: joi_1.default.string().required(),
            scoreDataList: joi_1.default.array().items(joi_1.default.object({
                score: joi_1.default.array().items(joi_1.default.number()).min(0).required(),
                userId: joi_1.default.number().required(),
                totalScore: joi_1.default.number().required(),
                username: joi_1.default.string().required(),
            })),
        });
        joi_1.default.assert(roundScoreCardData, scoreCardSchema);
        return roundScoreCardData;
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at roundScoreCard res validation for `, [roundScoreCardData, error]);
        throw new Error(error);
    }
}
exports.validateLastRoundScoreCardRes = validateLastRoundScoreCardRes;
function validateLastRoundScoreBoardRes(roundScoreBoardData) {
    try {
        const scoreBoardSchema = joi_1.default.object({
            tableId: joi_1.default.string().required(),
            potValue: joi_1.default.number().required(),
            tableState: joi_1.default.string().required(),
            split: joi_1.default.boolean().optional(),
            wildCard: joi_1.default.string().required(),
            winnerUserId: joi_1.default.number().required(),
            playerInfo: joi_1.default.array().items(joi_1.default.object({
                userId: joi_1.default.number().required(),
                username: joi_1.default.string().required(),
                profilePicture: joi_1.default.string().required(),
                userCash: joi_1.default.number().optional(),
                status: joi_1.default.string().required(),
                userStatus: joi_1.default.string()
                    .optional()
                    .valid(...Object.values(constants_1.PLAYER_STATE)),
                totalPoints: joi_1.default.number().required(),
                points: joi_1.default.number().required(),
                meld: joi_1.default.array().items(joi_1.default.string().required()),
                group: joi_1.default.array().items(joi_1.default.array().items(joi_1.default.string().optional())),
                isRebuyApplicable: joi_1.default.boolean().optional(),
                canPlayAgain: joi_1.default.boolean().optional(),
                rank: joi_1.default.number().optional(),
                winAmount: joi_1.default.number().optional(),
                tenant: joi_1.default.string().allow(null).optional()
            }).unknown(true)),
            rebuyable: joi_1.default.boolean().optional(),
            round: joi_1.default.number().optional(),
            splitAmountPerPlayer: joi_1.default.number().optional(),
            splitUsers: joi_1.default.array().items(joi_1.default.number()),
            tie: joi_1.default.boolean().optional(),
        }).unknown(true);
        joi_1.default.assert(roundScoreBoardData, scoreBoardSchema);
        return roundScoreBoardData;
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at roundScoreBoard res validation for`, [roundScoreBoardData, error]);
        throw new Error(error);
    }
}
exports.validateLastRoundScoreBoardRes = validateLastRoundScoreBoardRes;
function validateRebuyActionRes(rebuyActionRes) {
    try {
        joi_1.default.assert(rebuyActionRes, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            userId: joi_1.default.number().integer().greater(0).required(),
            username: joi_1.default.string().required(),
            avatarUrl: joi_1.default.string().required(),
            seatIndex: joi_1.default.number().integer().required(),
            totalPoints: joi_1.default.number().integer().required(),
            totalBootValue: joi_1.default.number().integer().required(),
            status: joi_1.default.string().required(),
            tenant: joi_1.default.string().required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at handleRebuyAccept res validation for ${JSON.stringify(rebuyActionRes)}`);
        throw new Error(error);
    }
}
exports.validateRebuyActionRes = validateRebuyActionRes;
function validateStandupRoomRes(standupData) {
    try {
        joi_1.default.assert(standupData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            userId: joi_1.default.number().required(),
            totalPoints: joi_1.default.number().required(),
            userCash: joi_1.default.number().required(),
            potValue: joi_1.default.number().required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at standupRoom res validation for `, [standupData, error]);
        throw new Error(error);
    }
}
exports.validateStandupRoomRes = validateStandupRoomRes;
