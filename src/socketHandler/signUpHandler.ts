import { Logger } from '../newLogger';
import { Lock } from 'redlock';
import { zk } from '../connections';
import { CONNECTION_TYPE, POPUP_TITLES } from '../constants';
import { ERROR_CODE } from '../constants/errors';
import { userProfileService } from '../db/userProfile';
import { SignUpInterface } from '../objectModels';
import { networkParams } from '../objectModels/playerGameplay';
import { addTable } from '../services/signUp/addTable';
import { reconnectTable } from '../services/signUp/reconnectTable';
import {
  InsufficientFundError,
  UnauthorizedError,
  FraudError,
} from '../utils/errors';
import { redlock } from '../utils/lock/redlock';
import { validateSignUp } from '../validators/request.validator';
import { MultiAccountError } from '../utils/errors/index';
import { alertPopup } from '../centralLibrary';
import {
  AlertType,
  ButtonAction,
  Color,
  ColorHexCode,
  GAME_SERVER_ERROR_REASONS,
} from '../enums';

export async function signUpHandler(
  signUpData: SignUpInterface,
  socket: any,
  networkParams?: networkParams,
) {
  let lock!: Lock;
  try {
    let response;
    Logger.info(`New SignUp Request with socket data `, [
      socket.data,
      `and signupData  and socket id ${socket.id}`,
      signUpData,
      socket.data.AppType,
    ]);
    validateSignUp(signUpData);

    lock = await redlock.Lock.acquire([`${socket.userId}`], 2000);
    Logger.info(
      `Lock acquired, in signupHandler resource:, ${lock.resource}`,
    );
    const userProfile =
      await userProfileService.getOrCreateUserDetailsById(
        socket.userId,
        socket.id,
        { ...socket.handshake?.headers, token: socket.data.token },
        '',
        socket.data.AppType,
      );

    if (signUpData.connectionType === CONNECTION_TYPE.ADD_TABLE) {
      const { lobbyId, inviteCode } = signUpData;
      if (!lobbyId && !inviteCode) throw new Error('lobbyId required for addTable');

      response = await addTable(signUpData, socket, networkParams);
    } else {
      // RECONNECTION / REJOIN FLOW
      if (
        signUpData.connectionType === CONNECTION_TYPE.RECONNECTION ||
        signUpData.connectionType === CONNECTION_TYPE.REJOIN
      ) {
        Logger.info(
          `signupHandler: connectionType: ${signUpData.connectionType}`,
        );
        response = await reconnectTable(
          socket,
          signUpData.connectionType,
        );
      }
    }
    response.tenant = userProfile.tenant;
    const tempResponse = { success: true, ...response };
    return tempResponse;
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR signupHandler err >>`, [error]);
    let errorObj = {};
    if (error instanceof MultiAccountError) {
      errorObj = {
        errorMessage: zk.getConfig().MULTI_ACCOUNT_TEXT,
        errorCode: ERROR_CODE.MULTI_ACCOUNT_FRAUD_DETECTED,
      };
    } else if (error instanceof UnauthorizedError) {
      errorObj = {
        errorMessage: zk.getConfig().AFM,
        errorCode: ERROR_CODE.UNAUTHORIZED,
      };
    } else if (error instanceof InsufficientFundError) {
      errorObj = {
        errorMessage: zk.getConfig().IMWPM,
        errorCode: ERROR_CODE.INSUFFICIENT_FUND,
      };
    } else if (error instanceof FraudError) {
      const fraudMessage = error.message || zk.getConfig().FRAUD_USER_TEXT;
      alertPopup.CustomCommonPopup(
        socket,
        {
          content: fraudMessage,
          title: POPUP_TITLES.FAIRPLAY_VIOLATION,
          textColor: ColorHexCode.WHITE,
        },
        {
          apkVersion: 0,
          tableId: '',
          userId: `${socket.userId}`,
          error: AlertType.GAME_SERVER_ERROR,
          reason: GAME_SERVER_ERROR_REASONS.FRAUD_DETECTED_GSE,
        },
        [
          {
            text: 'EXIT',
            action: ButtonAction.GOTOLOBBY,
            color_hex: ColorHexCode.RED,
            color: Color.RED,
          },
        ],
      );
      errorObj = {
        errorMessage: fraudMessage,
        errorCode: ERROR_CODE.MULTI_ACCOUNT_FRAUD_DETECTED,
      };
    }
    return { success: false, error: errorObj };
  } finally {
    try {
      if (lock && lock instanceof Lock) {
        await redlock.Lock.release(lock);
        Logger.info(
          `Lock releasing, in signupHandler; resource:, ${lock.resource}`,
        );
      }
    } catch (err: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error While releasing lock on signupHandler: ${err}`,
      );
    }
  }
}
