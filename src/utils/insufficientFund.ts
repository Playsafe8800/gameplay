import { Logger } from '../newLogger';
import { userProfileService } from '../db/userProfile';
import { UserProfile } from '../objectModels';
import { alertPopup } from '../centralLibrary/index';
import { POPUP_TITLES } from '../constants/index';
import {
  AlertType,
  Color,
  ColorHexCode,
} from '../centralLibrary/enums';
import { CONFIG } from '../constants';

export async function sendInsufficientFundEvent(
  userId: number,
  tableId: string,
) {
  const onePlayerData: UserProfile | null =
    await userProfileService.getUserDetailsById(userId);

  if (!onePlayerData)
    return Logger.error(
      `sendInsufficientFundEvent: userprofile data not found for user: ${userId}`,
    );

  // alertPopup.CustomCommonPopup(
  //   onePlayerData.socketId,
  //   {
  //     content: CONFIG.IMWPM,
  //     title: POPUP_TITLES.INSUFFICIENT_FUND,
  //     textColor: ColorHexCode.WHITE,
  //   },
  //   {
  //     apkVersion: 0,
  //     tableId,
  //     userId: `${userId}`,
  //     error: AlertType.INSUFFICIENT_FUND,
  //   },
  //   [
  //     {
  //       text: 'EXIT',
  //       action: 'OnClickPlayMoreNo',
  //       color_hex: ColorHexCode.RED,
  //       color: Color.RED,
  //     },
  //   ],
  // );
}
