import Joi from 'joi';
import { Logger } from '../newLogger';
import { CONNECTION_TYPE } from '../constants/index';
import {
  SignUpInterface,
  PickCardInterface,
  ThrowCardInterface,
  DropCardInterface,
  AutoDropCardInterface,
  RoundScoreCardDataInterface,
} from '../objectModels';

export function validateAutoDropCardReq(
  dropCardData: AutoDropCardInterface,
) {
  try {
    Joi.assert(
      dropCardData,
      Joi.object({
        tableId: Joi.string().required(),
        autoDropEnable: Joi.boolean().required(),
        dropAndSwitch: Joi.boolean().optional(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at auto drop req validation for `,
      [dropCardData,
        error]
    );
    throw new Error(error);
  }
}

export function validateSignUp(signUpData: SignUpInterface) {
  try {
    Joi.assert(
      signUpData,
      Joi.object({
        lobbyId: Joi.number().optional(),
        connectionType: Joi.string()
          .valid(...Object.values(CONNECTION_TYPE))
          .required(),
        tableSessionId: Joi.string().allow(null, ''),
        unitySessionId: Joi.string().allow(null, ''),
      }).unknown(true),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at signup req validation for `,
      [signUpData,
        error]
    );
    throw new Error(error);
  }
}

export function validatePickCardReq(pickCardData: PickCardInterface) {
  try {
    Joi.assert(
      pickCardData,
      Joi.object({
        tableId: Joi.string().required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at pickCard req validation for `,
      [pickCardData,
        error]
    );
    throw new Error(error);
  }
}

export function validateThrowCardReq(
  throwCardData: ThrowCardInterface,
) {
  try {
    Joi.assert(
      throwCardData,
      Joi.object({
        tableId: Joi.string().required(),
        card: Joi.string().required(),
        group: Joi.array().items(
          Joi.array().items(Joi.string().optional()),
        ),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at throwCard req validation for `,
      [throwCardData, error],
    );
    throw new Error(error);
  }
}

export function validateDropCardReq(dropCardData: DropCardInterface) {
  try {
    Joi.assert(
      dropCardData,
      Joi.object({
        tableId: Joi.string().required(),
        dropAndSwitch: Joi.boolean().optional(),
      }),
    );
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at dropCard req validation for `, [
      dropCardData,
      error,
    ]);
    throw new Error(error);
  }
}

export function validateLastRoundScoreCardReq(
  roundScoreCardData: RoundScoreCardDataInterface,
) {
  try {
    Joi.assert(
      roundScoreCardData,
      Joi.object({
        tableId: Joi.string().required(),
        round: Joi.number().optional(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at roundScoreCard req validation for `,
      [roundScoreCardData, error],
    );
    throw new Error(error);
  }
}

export function validateLastRoundScoreBoardReq(
  roundScoreBoardData: RoundScoreCardDataInterface,
) {
  try {
    Joi.assert(
      roundScoreBoardData,
      Joi.object({
        tableId: Joi.string().required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at roundScoreBoard req validation for `,
      [roundScoreBoardData, error],
    );
    throw new Error(error);
  }
}
