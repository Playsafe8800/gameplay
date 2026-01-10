import Joi from 'joi';
import { CURRENCY_TYPE } from '../../constants/tableState';

class TableConfiguration {
  joiSchemaValidator() {
    return Joi.object().keys({
      _id: Joi.string().required(),
      bootValue: Joi.number().required(),
      gameId: Joi.number().required(),
      gameStartTimer: Joi.number().required(),
      lobbyId: Joi.number().required(),
      manualSplit: Joi.boolean().required(),
      maximumPoints: Joi.number().required(),
      maximumSeat: Joi.number().required(),
      minimumSeat: Joi.number().required(),
      multiWinner: Joi.boolean().required(),
      pileDiscardEnabled: Joi.boolean().required(),
      rakePercentage: Joi.number().required(),
      currentRound: Joi.number().required(),
      shuffleEnabled: Joi.boolean().required(),
      userTurnTimer: Joi.number().required(),
      isSplitable: Joi.boolean().required(),
      currencyType: Joi.string()
        .default(CURRENCY_TYPE.INR)
        .valid(
          CURRENCY_TYPE.INR,
          CURRENCY_TYPE.USD,
          CURRENCY_TYPE.COINS,
        )
        .description('type of currency')
        .required(),
    });
  }
}

const tableConfigurationValidator = new TableConfiguration();

export = tableConfigurationValidator;
