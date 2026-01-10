import { Logger } from '../../newLogger';
import { zk } from '../../connections';
import { userProfileService } from '../../db/userProfile';
import { UserProfile } from '../../objectModels';
import { sendInsufficientFundEvent } from '../../utils/insufficientFund';
import { eventStateManager } from '../../state/events';
import { STATE_EVENTS } from '../../constants/events';
import { CONFIG, POPUP_TITLES } from '../../constants/index';
import { alertPopup } from '../../centralLibrary/index';
import {
  AlertType,
  Color,
  ColorHexCode,
} from '../../centralLibrary/enums';

class PlayMore {
  async send(userId: number, tableId: string): Promise<void> {
    const userInfo = await userProfileService.getUserDetailsById(
      userId,
    );
    if (!userInfo) throw new Error('UserProfile not found');

    // alertPopup.CustomCommonPopup(
    //   userInfo.socketId,
    //   {
    //     content: CONFIG.PLAY_MORE_TEXT,
    //     title: POPUP_TITLES.PLAY_MORE,
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
    //       text: 'YES',
    //       action: 'OnClickPlayMoreYes',
    //       color_hex: ColorHexCode.GREEN,
    //       color: Color.GREEN,
    //     },
    //     {
    //       text: 'NO',
    //       action: 'OnClickPlayMoreNo',
    //       color_hex: ColorHexCode.RED,
    //       color: Color.RED,
    //     },
    //   ],
    // );
  }

  async checkPlayAgainAndUpsellData(
    tableId: string,
    tableInfo: any,
    players: any[],
    finalDataGrpc: any,
    tableConfigData: any,
  ) {
    /**
     * filter player who can't play new game and set isPlayAgain flag in playerData
     */
    const filterPlayerData = finalDataGrpc.playersData.filter(
      (pd: any) => !pd.isPlayAgain,
    );
    players.map((player) => {
      player.isPlayAgain = true;
      filterPlayerData.map((insufficientFundPlayer: any) => {
        if (player.userId === insufficientFundPlayer.userId) {
          player.isPlayAgain = false;
        }
        return insufficientFundPlayer;
      });
      return player;
    });

    /**
     * filter player who get upsell data and set that data in playerData
     */
    const filterPlayerDataWithUpsell =
      finalDataGrpc.playersData.filter(
        (pd: any) => pd.nextSuggestedLobby,
      );
    players.map((player) => {
      player.isPlayWithUpsellData = {};
      filterPlayerDataWithUpsell.map((upsellPlayer) => {
        if (player.mplId === upsellPlayer.userId) {
          player.isPlayWithUpsellData =
            upsellPlayer.nextSuggestedLobby;
        }
        return upsellPlayer;
      });
      return player;
    });
    Promise.all([
      this.sendPlayMoreEventToAllPlayers(
        tableId,
        tableInfo,
        players,
        tableConfigData,
        0,
      ),
      eventStateManager.fireEvent(tableId, STATE_EVENTS.PLAY_MORE),
    ]);
  }

  async sendPlayMoreEventToAllPlayers(
    tableId: string,
    tableInfo: any,
    playerData: any[],
    tableConfigData: any,
    iteration: number,
  ) {
    const config = zk.getConfig();
    const players = playerData;

    if (config.PLAYMORE) {
      if (iteration < players.length) {
        if (!players[iteration].isPlayAgain) {
          Logger.info(
            `sendPlayMoreEventToAllPlayers: sendInsufficientFundEvent for table: ${tableId}`,
            [players[iteration], tableConfigData],
          );

          await sendInsufficientFundEvent(
            players[iteration].userId,
            tableId,
          );

          this.sendPlayMoreEventToAllPlayers(
            tableId,
            tableInfo,
            players,
            tableConfigData,
            iteration + 1,
          );
        } else {
          Logger.info(`sendPlayMoreEventToAllPlayers: else >>`);
          await this.send(players[iteration].userId, tableId);

          this.sendPlayMoreEventToAllPlayers(
            tableId,
            tableInfo,
            players,
            tableConfigData,
            iteration + 1,
          );
        }
      } else {
        const playersInfoPromise = tableInfo.seats.map((seat: any) =>
          userProfileService.getUserDetailsById(seat._id),
        );
        const playersInfo: Array<UserProfile | null> =
          await Promise.all(playersInfoPromise);

        playersInfo.forEach((player: UserProfile | null) => {
          if (player) {
            player.tableIds = player.tableIds.filter(
              (t_id) => t_id !== tableId,
            );
            userProfileService.setUserDetails(player.id, player);
          }
        });
      }
      // else {
      //   setTimeout(() => {
      //     Lib.Round.dumpGame(tableData._id);
      //   }, Lib.CONSTANTS.NUMERICAL.SIXTY * Lib.CONSTANTS.NUMERICAL.TEN_THOUSAND);
      //   Logger.debug('PlayMore Timer started ----------------');
      //   const timer = config.PLAYMORE_POP_TIMER * NUMERICAL.THOUSAND;
      //   const { currentRound } = tableConfigData;
      //   const jobId = `${tableConfigData._id}-${currentRound}`;
      //   Lib.Scheduler.addJob.playMoreTimer({
      //     timer,
      //     jobId,
      //     players,
      //     tableConfigData,
      //   });
      // }
    } else {
      Logger.error(`INTERNAL_SERVER_ERROR playe more is false in config >>> `);
      /**
       * remove all users recursively
       */
      // for await (const singlePlayer of players) {
      //   /**
      //    * send exit event to close the play more popup and redirect into react
      //    */
      //   sendExitEvent(singlePlayer.userObjectId);
      // }
    }
  }
}

export = new PlayMore();
