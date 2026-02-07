"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLastRoundScoreBoardReq = exports.validateLastRoundScoreCardReq = exports.validateDropCardReq = exports.validateThrowCardReq = exports.validatePickCardReq = exports.validateSignUp = exports.validateAutoDropCardReq = void 0;
const joi_1 = __importDefault(require("joi"));
const newLogger_1 = require("../newLogger");
const index_1 = require("../constants/index");
function validateAutoDropCardReq(dropCardData) {
    try {
        joi_1.default.assert(dropCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            autoDropEnable: joi_1.default.boolean().required(),
            dropAndSwitch: joi_1.default.boolean().optional(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at auto drop req validation for `, [dropCardData,
            error]);
        throw new Error(error);
    }
}
exports.validateAutoDropCardReq = validateAutoDropCardReq;
function validateSignUp(signUpData) {
    try {
        joi_1.default.assert(signUpData, joi_1.default.object({
            lobbyId: joi_1.default.number().optional(),
            connectionType: joi_1.default.string()
                .valid(...Object.values(index_1.CONNECTION_TYPE))
                .required(),
            tableSessionId: joi_1.default.string().allow(null, ''),
            unitySessionId: joi_1.default.string().allow(null, ''),
        }).unknown(true));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at signup req validation for `, [signUpData,
            error]);
        throw new Error(error);
    }
}
exports.validateSignUp = validateSignUp;
function validatePickCardReq(pickCardData) {
    try {
        joi_1.default.assert(pickCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at pickCard req validation for `, [pickCardData,
            error]);
        throw new Error(error);
    }
}
exports.validatePickCardReq = validatePickCardReq;
function validateThrowCardReq(throwCardData) {
    try {
        joi_1.default.assert(throwCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            card: joi_1.default.string().required(),
            group: joi_1.default.array().items(joi_1.default.array().items(joi_1.default.string().optional())),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at throwCard req validation for `, [throwCardData, error]);
        throw new Error(error);
    }
}
exports.validateThrowCardReq = validateThrowCardReq;
function validateDropCardReq(dropCardData) {
    try {
        joi_1.default.assert(dropCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            dropAndSwitch: joi_1.default.boolean().optional(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at dropCard req validation for `, [
            dropCardData,
            error,
        ]);
        throw new Error(error);
    }
}
exports.validateDropCardReq = validateDropCardReq;
function validateLastRoundScoreCardReq(roundScoreCardData) {
    try {
        joi_1.default.assert(roundScoreCardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
            round: joi_1.default.number().optional(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at roundScoreCard req validation for `, [roundScoreCardData, error]);
        throw new Error(error);
    }
}
exports.validateLastRoundScoreCardReq = validateLastRoundScoreCardReq;
function validateLastRoundScoreBoardReq(roundScoreBoardData) {
    try {
        joi_1.default.assert(roundScoreBoardData, joi_1.default.object({
            tableId: joi_1.default.string().required(),
        }));
    }
    catch (error) {
        newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at roundScoreBoard req validation for `, [roundScoreBoardData, error]);
        throw new Error(error);
    }
}
exports.validateLastRoundScoreBoardReq = validateLastRoundScoreBoardReq;
