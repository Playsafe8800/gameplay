import * as authMe from '../utils/ackMid';
import { Logger } from '../newLogger';
import { eventStateManager } from '../state/events';
import { v4 as uuidv4 } from 'uuid';
import { ERROR_CAUSES, ERROR_CODE } from '../constants/errors';
import { EVENTS, SAFE_STATE_EVENTS } from '../constants/events';
import { networkParams } from '../objectModels';
import EmoJi from '../services/emoji';
import { dropGame } from '../services/finishEvents/dropGame';
import { finishGame } from '../services/finishEvents/finishGame';
import { cardHandler } from '../services/gameplay/cardHandler';
import {
  getLastRoundScoreBoard,
  getLastRoundScoreCard,
} from '../services/gameplay/scoreCardAndScoreBoard';
import { handleOpenGamePopup } from '../services/handleOpenGamePopup';
import { joinBack } from '../services/joinBack';
import LeaveTableHandler from '../services/leaveTable';
import { switchTable } from '../services/leaveTable/switchTable';
import { pickFromClosedDeck } from '../services/moves/pickFromClosedDeck';
import { pickFromOpenDeck } from '../services/moves/pickFromOpenDeck';
import { throwCard } from '../services/moves/throwCard';
import RebuyHandler from '../services/rebuy';
import gameTableInfo from '../services/signUp/gameTableInfo';
import { splitHandler } from '../services/split';
import { userService } from '../services/userService';
import { StateError } from '../utils/errors';
import { signUpHandler } from './signUpHandler';

async function requestHandler(
  this: any,
  [eventName, payload, ack],
  next,
) {
  const that = this;
    const requestReceivedAt = `${new Date().getTime()}`;
    const socket = that;
    const requestUUID = uuidv4();
    const { userId } = socket;

    const {
      data,
      metrics,
      networkParams,
    }: {
      [x: string]: any;
      networkParams: networkParams;
    } = JSON.parse(payload);

    if (eventName !== 'HEART_BEAT')
      Logger.info('EVENT_RECEIVED: ', [
        eventName,
        userId,
        payload,
        requestUUID,
        networkParams,
      ]);

    const { tableId } = data;

    try {
      if (tableId && !SAFE_STATE_EVENTS.includes(eventName)) {
        const eligibility = await eventStateManager.isEligible(
          tableId,
          eventName,
        );
        if (!eligibility.isEligible)
          throw new StateError(
            `Invalid event ${eventName} for table id ${tableId} in table state ${eligibility.state}`,
          );
      }

      if (tableId && userId && networkParams?.timeStamp) {
        const eligibility = await eventStateManager.isEligibleUser(
          tableId,
          userId,
          networkParams.timeStamp,
        );
        if (!eligibility.isEligible)
          throw new StateError(
            `Invalid event ${eventName} for table id ${tableId}|${userId}
          in table state ${eligibility.state}|${eligibility.timestamp}`,
          );
      }

      if (!userId) {
        throw new StateError(
          `User id not set for table ${tableId} and event ${eventName}`,
        );
      }
      let response;
      switch (eventName) {
        case EVENTS.HEART_BEAT_SOCKET_EVENT:
          data.processedTime = new Date().toISOString();
          authMe.ackMid(
            data,
            metrics,
            socket.userId,
            '',
            ack,
            requestReceivedAt,
            eventName,
          );
          break;
        case EVENTS.SIGN_UP:
          response = await signUpHandler(data, socket, networkParams);
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response && 'tableId' in response ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.GROUP_CARDS:
          response = await cardHandler.groupCards(
            data,
            socket,
            networkParams,
          );
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.PICK_FROM_CLOSE_DECK_SOCKET_EVENT:
          response = await pickFromClosedDeck(
            data,
            socket,
            networkParams,
            false
          );
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.PICK_FROM_OPEN_DECK_SOCKET_EVENT:
          response = await pickFromOpenDeck(
            data,
            socket,
            networkParams,
            false
          );
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.DISCARD_CARD_SOCKET_EVENT:
          response = await throwCard(data, socket, networkParams, false);
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.DROP_SOCKET_EVENT: // Drop Cards
          response = await dropGame(data, socket);
          if (!response) response = {};
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId || '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.OPEN_REBUY_POPUP:
          response = await RebuyHandler.rebuyPopup(data, socket);
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId || '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.REBUY_ACTION:
          await RebuyHandler.rebuyTable(data, socket.userId);
          break;
        case EVENTS.LEAVE_TABLE:
          response = await LeaveTableHandler.main(
            data,
            socket.userId,
            networkParams,
          );
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.ROUND_SCORE_CARD_SOCKET_EVENT:
          response = await getLastRoundScoreCard(data, socket);
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.ROUND_SCORE_BOARD_SOCKET_EVENT:
          response = await getLastRoundScoreBoard(data, socket);
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;

        case EVENTS.DECLARE_CARD:
          response = await cardHandler.declareCard(
            data,
            socket,
            networkParams,
          );
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.FINISH_ROUND:
          response = await finishGame.finishRound(
            data,
            socket,
            networkParams,
          );
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.OPEN_SPLIT_POPUP:
          response = await splitHandler.splitPopup(data, socket);
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.SPLIT_ACCEPT_REJECT:
          await splitHandler.handleSplitAcceptReject(data, socket);
          break;
        case EVENTS.SET_EMOJI:
          await EmoJi.send(socket.userId, data.tableId, data.emojiId);
          break;
        case EVENTS.OPEN_GAME_POPUP_SOCKET_EVENT:
          response = await handleOpenGamePopup(data, socket);
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.GAME_INFO:
          response = await gameTableInfo.getTableInfo(data);
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            data.tableId,
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.DISCARDED_CARDS:
          response = await cardHandler.discardedCards(data?.tableId);
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.SWITCH_TABLE_SOCKET_EVENT:
          response = await switchTable(data, socket);
          if (ack) authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.JOIN_BACK_SOCKET_EVENT:
          response = await joinBack(data, socket, networkParams);
          authMe.ackMid(
            response,
            metrics,
            socket.userId,
            response?.tableId ? response.tableId : '',
            ack,
            requestReceivedAt,
          );
          break;
        case EVENTS.USER_BALANCE_SOCKET_EVENT:
          response = await userService.getUserBalance(
            data?.userId,
            socket,
            socket.data.token,
            ack,
          );
          if (response) {
            authMe.ackMid(
              response,
              metrics,
              socket.userId,
              response?.tableId ? response.tableId : '',
              ack,
              requestReceivedAt,
            );
          }
          break;
      }
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at event handler`, [
        eventName,
        tableId,
        userId,
        payload,
        requestUUID,
        error
      ]);

      if (error instanceof StateError) {
        const errorObj = {
          errorMessage: ERROR_CAUSES.STATE_ERROR,
          errorCode: ERROR_CODE.STATE_ERROR,
          responseType: '',
        };
        const response = {
          success: false,
          error: errorObj,
          tableId,
        };
        authMe.ackMid(
          response,
          metrics,
          socket.userId,
          response && 'tableId' in response ? response.tableId : '',
          ack,
          requestReceivedAt,
        );
      } else {
        return { success: false, error };
      }
    }
    next();
}

export = requestHandler;
