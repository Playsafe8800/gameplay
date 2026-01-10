import Joi from 'joi';
import { Logger } from '../newLogger';
import { PLAYER_STATE } from '../constants';
import {
  DropCardRoomInterface,
  DropCardRoomPointsInterface,
  PickCardAckInterface,
  PickCardRoomInterface,
  RebuyActionRes,
  RoundScoreBoardDataAckInterface,
  RoundScoreCardDataAckInterface,
  StandupRoomInterface,
  ThrowCardAckInterface,
  ThrowCardRoomInterface,
} from '../objectModels';
import { tableConfigurationService } from 'src/db/tableConfiguration';

export function validatePickCardAckRes(
  pickCardData: PickCardAckInterface,
) {
  try {
    Joi.assert(
      pickCardData,
      Joi.object({
        tableId: Joi.string().required(),
        card: Joi.string().required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at pickCardAck res validation for `,
      [pickCardData, error],
    );
    throw new Error(error);
  }
}

export function validatePickCardRoomRes(
  pickCardData: PickCardRoomInterface,
) {
  try {
    Joi.assert(
      pickCardData,
      Joi.object({
        tableId: Joi.string().required(),
        userId: Joi.number().required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at pickCardRoom res validation for `,
      [pickCardData, error],
    );
    throw new Error(error);
  }
}

export function validateThrowCardAckRes(
  throwCardData: ThrowCardAckInterface,
) {
  try {
    Joi.assert(
      throwCardData,
      Joi.object({
        tableId: Joi.string().required(),
        score: Joi.number().required(),
        meld: Joi.array().items(Joi.string().required()),
        group: Joi.array().items(
          Joi.array().items(Joi.string().optional()),
        ),
        isValid: Joi.boolean().required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at validateThrowCardAckRes res validation for `,
      [throwCardData, error],
    );
    throw new Error(error);
  }
}

export function validateThrowCardRoomRes(
  throwCardData: ThrowCardRoomInterface,
) {
  try {
    Joi.assert(
      throwCardData,
      Joi.object({
        tableId: Joi.string().required(),
        userId: Joi.number().required(),
        card: Joi.string().required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at validateThrowCardRoomRes res validation for `,
      [throwCardData, error],
    );
    throw new Error(error);
  }
}

export function validateDropCardRoomRes(
  dropCardData: DropCardRoomInterface,
) {
  try {
    Joi.assert(
      dropCardData,
      Joi.object({
        tableId: Joi.string().required(),
        userId: Joi.number().required(),
        totalPoints: Joi.number().required(),
        status: Joi.string().required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at dropCardRoom res validation for `,
      [dropCardData, error],
    );
    throw new Error(error);
  }
}

export function validateDropCardRoomPointsRes(
  dropCardData: DropCardRoomPointsInterface,
) {
  try {
    Joi.assert(
      dropCardData,
      Joi.object({
        tableId: Joi.string().required(),
        userId: Joi.number().required(),
        totalPoints: Joi.number().required(),
        status: Joi.string().required(),
        potValue: Joi.number().required(),
        winningCash: Joi.number().required(),
        userCash: Joi.number().required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at dropCardRoom res validation for `,
      [dropCardData, error],
    );
    throw new Error(error);
  }
}

export function validateLastRoundScoreCardRes(
  roundScoreCardData: RoundScoreCardDataAckInterface,
) {
  try {
    const scoreCardSchema = Joi.object({
      tableId: Joi.string().required(),
      scoreDataList: Joi.array().items(
        Joi.object({
          score: Joi.array().items(Joi.number()).min(0).required(),
          userId: Joi.number().required(),
          totalScore: Joi.number().required(),
          username: Joi.string().required(),
        }),
      ),
    });

    Joi.assert(roundScoreCardData, scoreCardSchema);
    return roundScoreCardData;
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at roundScoreCard res validation for `,
      [roundScoreCardData, error],
    );
    throw new Error(error);
  }
}

export function validateLastRoundScoreBoardRes(
  roundScoreBoardData: RoundScoreBoardDataAckInterface | null,
) {
  try {
    const scoreBoardSchema = Joi.object({
      tableId: Joi.string().required(),
      potValue: Joi.number().required(),
      tableState: Joi.string().required(),
      split: Joi.boolean().optional(),
      wildCard: Joi.string().required(),
      winnerUserId: Joi.number().required(),
      playerInfo: Joi.array().items(
        Joi.object({
          userId: Joi.number().required(),
          username: Joi.string().required(),
          profilePicture: Joi.string().required(),
          userCash: Joi.number().optional(),
          status: Joi.string().required(),
          userStatus: Joi.string()
            .optional()
            .valid(...Object.values(PLAYER_STATE)),
          totalPoints: Joi.number().required(),
          points: Joi.number().required(),
          meld: Joi.array().items(Joi.string().required()),
          group: Joi.array().items(
            Joi.array().items(Joi.string().optional()),
          ),
          isRebuyApplicable: Joi.boolean().optional(),
          canPlayAgain: Joi.boolean().optional(),
          rank: Joi.number().optional(),
          winAmount: Joi.number().optional(),
          tenant: Joi.string().allow(null).optional()
        }).unknown(true),
      ),
      rebuyable: Joi.boolean().optional(),
      round: Joi.number().optional(),
      splitAmountPerPlayer: Joi.number().optional(),
      splitUsers: Joi.array().items(Joi.number()),
      tie: Joi.boolean().optional(),
    }).unknown(true);

    Joi.assert(roundScoreBoardData, scoreBoardSchema);
    return roundScoreBoardData;
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at roundScoreBoard res validation for`,
      [roundScoreBoardData, error],
    );
    throw new Error(error);
  }
}

export function validateRebuyActionRes(
  rebuyActionRes: RebuyActionRes,
): void {
  try {
    Joi.assert(
      rebuyActionRes,
      Joi.object({
        tableId: Joi.string().required(),
        userId: Joi.number().integer().greater(0).required(),
        username: Joi.string().required(),
        avatarUrl: Joi.string().required(),
        seatIndex: Joi.number().integer().required(),
        totalPoints: Joi.number().integer().required(),
        totalBootValue: Joi.number().integer().required(),
        status: Joi.string().required(),
        tenant: Joi.string().required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${
        error.message
      } at handleRebuyAccept res validation for ${JSON.stringify(
        rebuyActionRes,
      )}`,
    );
    throw new Error(error);
  }
}

export function validateStandupRoomRes(
  standupData: StandupRoomInterface,
) {
  try {
    Joi.assert(
      standupData,
      Joi.object({
        tableId: Joi.string().required(),
        userId: Joi.number().required(),
        totalPoints: Joi.number().required(),
        userCash: Joi.number().required(),
        potValue: Joi.number().required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at standupRoom res validation for `,
      [standupData, error],
    );
    throw new Error(error);
  }
}
