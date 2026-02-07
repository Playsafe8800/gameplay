"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableConfigurationValidator = void 0;
const joi_1 = __importDefault(require("joi"));
const constants_1 = require("../constants");
class TableConfiguration {
    joiSchemaValidator() {
        return joi_1.default.object().keys({
            _id: joi_1.default.string().required(),
            bootValue: joi_1.default.number().required(),
            gameId: joi_1.default.number().required(),
            gameStartTimer: joi_1.default.number().required(),
            lobbyId: joi_1.default.number().required(),
            manualSplit: joi_1.default.boolean().required(),
            maximumPoints: joi_1.default.number().required(),
            maximumSeat: joi_1.default.number().required(),
            minimumSeat: joi_1.default.number().required(),
            multiWinner: joi_1.default.boolean().required(),
            pileDiscardEnabled: joi_1.default.boolean().required(),
            rakePercentage: joi_1.default.number().required(),
            currentRound: joi_1.default.number().required(),
            shuffleEnabled: joi_1.default.boolean().required(),
            userTurnTimer: joi_1.default.number().required(),
            isSplitable: joi_1.default.boolean().required(),
            currencyType: joi_1.default.string()
                .default(constants_1.CURRENCY_TYPE.INR)
                .valid(constants_1.CURRENCY_TYPE.INR, constants_1.CURRENCY_TYPE.USD, constants_1.CURRENCY_TYPE.COINS)
                .description('type of currency')
                .required(),
            isRTPHandlingEnabled: joi_1.default.boolean().required().default(false),
            featureNameForRTP: joi_1.default.string().optional().allow(''),
        });
    }
}
exports.tableConfigurationValidator = new TableConfiguration();
