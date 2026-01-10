import { Logger } from '../../newLogger';
import { roundScoreCardService } from '../../db/roundScoreCard';
import { roundScoreBoardService } from '../../db/roundScoreBoard';
import { validateLastRoundScoreCardReq } from '../../validators/request.validator';
import {
  validateLastRoundScoreBoardRes,
  validateLastRoundScoreCardRes,
} from '../../validators/response.validator';
import { tableConfigurationService } from '../../db/tableConfiguration';

/**
 * get last all rounds player points
 * player scores card
 */
export const getLastRoundScoreCard = async (
  data: { tableId: string },
  socket: any,
) => {
  try {
    validateLastRoundScoreCardReq(data);
    const { tableId } = data;

    const scoresCardData =
      await roundScoreCardService.getRoundScoreCard(tableId);

    const responseObj = {
      tableId,
      scoreDataList: scoresCardData,
    };
    validateLastRoundScoreCardRes(responseObj);

    return responseObj;
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR getLastRoundScoresCard: tableId: ${data?.tableId} userId: ${socket?.userId}`,
      [error],
    );
    return {
      message: 'Scorecard data is not available!',
    };
  }
};

/**
 * get last round winner score board
 */
export const getLastRoundScoreBoard = async (
  data: { tableId: string; round: number },
  socket: any,
) => {
  try {
    validateLastRoundScoreCardReq(data);
    const { tableId } = data;
    let { round } = data;

    if (!round) {
      const tableConfigData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          ['currentRound'],
        );
      round = tableConfigData?.currentRound
        ? tableConfigData?.currentRound - 1
        : 1;
    }

    const roundScoreBoard =
      await roundScoreBoardService.getRoundScoreBoard(tableId, round);

    Logger.info('-----roundScoreBoard---', [
      roundScoreBoard,
      tableId,
    ]);
    if (roundScoreBoard) roundScoreBoard.round = round;
    validateLastRoundScoreBoardRes(roundScoreBoard);

    return roundScoreBoard;
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR getLastRoundScoreBoard: tableId: ${data?.tableId} userId: ${socket?.userId}`,
      [error],
    );
    return {
      message: 'This round data is not available!',
    };
  }
};
