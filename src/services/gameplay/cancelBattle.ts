import { Logger } from '../../newLogger';
import { zk } from '../../connections';
import { tableConfigurationService } from '../../db/tableConfiguration/index';
import { tableGameplayService } from '../../db/tableGameplay/index';
import { userProfileService } from '../../db/userProfile/index';
import { UserProfile } from '../../objectModels';
import { CancelBattleError, FraudError } from '../../utils/errors';
import { dumpGameHelper } from './dumpGame';
import { alertPopup } from '../../centralLibrary';
import { POPUP_TITLES } from '../../constants';
import { AlertType, ButtonAction, Color, ColorHexCode } from '../../enums';

class CancelBattle {
  async cancelBattle(
    tableId: string,
    cancelBattle: CancelBattleError | FraudError,
  ) {
    try {
      Logger.info(
        `cancelling battle of table: ${tableId}`,
        cancelBattle,
      );
      const tableConfig =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          ['currentRound',
          'gameType']
        );
      // // @ts-ignore
      // Logger.info(
      //   tableConfig,
      //   '  tableConfig data for table :-',
      //   tableId,
      // );

      const { currentRound } = tableConfig;
      const tableGamePlay =
        await tableGameplayService.getTableGameplay(
          tableId,
          currentRound,
          ["seats"]
        );
      // Logger.info(
      //   tableGamePlay,
      //   '  tableGamePlay data for table :-',
      //   tableId,
      // );

      if (tableGamePlay?.seats?.length) {
        const userIds = tableGamePlay.seats
          .map((e) => e._id)
          .filter(Boolean);

        const userProfiles = await Promise.all(
          userIds.map((uId) => {
            return userProfileService.getUserDetailsById(uId);
          }),
        );
        // Logger.info(
        //   userProfiles,
        //   '  userProfiles for table :- ',
        //   tableId,
        // );

        if (cancelBattle instanceof CancelBattleError) {
          await this.sendCancelBattlePopup(tableId, userProfiles);
          // grpc cancel battle call
          const cancellationDetails = {
            source: tableConfig.gameType,
            reason: cancelBattle.message,
            reasonType: 'DATA_CORRUPTION', // proto based limitation
          };
          // await grpcBattle.sendCancelBattle(
          //   tableId,
          //   lobbyId,
          //   cancellationDetails,
          //   tableConfig.gameType,
          //   tableConfig.cgsClusterName,
          //   tableConfig.currentRound,
          // );
        }
      }
      await dumpGameHelper.dumpGame(tableId, true);
      return true;
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR on cancelBattle: table: ${tableId}`, [
        cancelBattle,
        error
      ]);
      return false;
    }
  }

  private async sendCancelBattlePopup(
    tableId: string,
    userProfiles: Array<UserProfile | null>,
  ) {
    if (!userProfiles?.length) {
      Logger.error(`INTERNAL_SERVER_ERROR sendCancelBattlePopup: useProfiles error `, [
        userProfiles,
      ]);
      return;
    }
    userProfiles.forEach((userProfile: any) => {
      this.sendPopUp(
        userProfile.id,
        userProfile.socketId,
        tableId,
        zk.getConfig().ERRM,
      );
    });
  }

  private sendPopUp(
    userId: number,
    socketId: string,
    tableId: string,
    content: string,
  ) {
    // alertPopup.CustomCommonPopup(
    //   socketId,
    //   {
    //     content,
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
    //       action: ButtonAction.GOTOLOBBY,
    //       color_hex: ColorHexCode.RED,
    //       color: Color.RED,
    //     },
    //   ],
    // );
  }
}

export const cancelBattle = new CancelBattle();
