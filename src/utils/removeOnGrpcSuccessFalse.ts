import { Logger } from '../newLogger';
import { zk } from '../connections';
import { LEAVE_TABLE_REASONS, POPUP_TITLES } from '../constants';

import { userProfileService } from '../db/userProfile';
import { UserProfile } from '../objectModels';
import { alertPopup } from '../centralLibrary';
import { AlertType, ButtonAction, Color, ColorHexCode } from '../enums';

export async function removeOnGrpcSuccessFalse(
  tableData: any,
  playingUsersPgp: any[],
  errMsg: string,
  reason: string
) {
  Logger.info(`removeOnGrpcSuccessFalse: `, [
    tableData,
    playingUsersPgp,
  ]);

  // Import here to avoid circular dependency
  const LeaveTableHandler = (await import('../services/leaveTable'))
    .default;
  for (let i = 0; i < playingUsersPgp.length; i++) {
    const currentPlayer = playingUsersPgp[i];
    const userObject = await userProfileService.getUserDetailsById(
      currentPlayer.userId,
    );
    if (userObject) {
      await sendPopupOnGrpcFailed(
        userObject.id,
        tableData._id,
        errMsg || zk.getConfig().ERRM,
      );
      await LeaveTableHandler.main(
        {
          reason: LEAVE_TABLE_REASONS.GRPC_FAILED,
          // TODO: enable this when client handles exit from generic popup, currently it's not exiting from popup
          // reason: reason || LEAVE_TABLE_REASONS.GRPC_FAILED,
          tableId: tableData._id,
        },
        userObject.id,
      );
    }
  }
}

export async function sendPopupOnGrpcFailed(
  userId: number,
  tableId: string,
  errMsg: string,
) {
  const onePlayerData: UserProfile | null =
    await userProfileService.getUserDetailsById(userId);

  if (!onePlayerData)
    return Logger.error(
      `INTERNAL_SERVER_ERROR sendPopupOnGrpcFailed: userprofile data not found for user: ${userId}`,
    );

  // alertPopup.CustomCommonPopup(
  //   onePlayerData.socketId,
  //   {
  //     content: errMsg,
  //     title: POPUP_TITLES.ALERT,
  //     textColor: ColorHexCode.WHITE,
  //   },
  //   {
  //     apkVersion: 0,
  //     tableId,
  //     userId: `${userId}`,
  //     error: AlertType.GAME_SERVER_ERROR,
  //   },
  //   [
  //     {
  //       text: 'EXIT',
  //       action: ButtonAction.OKAY,
  //       color_hex: ColorHexCode.RED,
  //       color: Color.RED,
  //     },
  //   ],
  // );
}
