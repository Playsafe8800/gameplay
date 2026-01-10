import { Logger } from '../../newLogger';
import { EVENTS, PLAYER_STATE } from '../../constants';
import { userProfileService } from '../../db/userProfile';
import { UserProfile } from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import { playerGameplayService } from '../../db/playerGameplay';

export async function seatShuffle(
  tableId: string,
  currentRound: number,
  tableGamePlayData: any,
  eliminatedPlayers: any,
  isTableRejoinable: boolean,
  scoreBoardData: any,
) {
  try {
    Logger.info(`seatShuffle for table: ${tableId}:${currentRound}`);

    if (!tableGamePlayData?.seats?.length) {
      throw new Error(
        `tableGameplayData|seats not found for table: ${tableId}:${currentRound} from seatShuffle`,
      );
    }

    const playersInfo = (
      await Promise.all(
        tableGamePlayData.seats.map(async (seat: any) => {
          const exists = eliminatedPlayers.find(
            (player: any) =>
              player.userId === seat._id &&
              (player.userStatus === PLAYER_STATE.LEFT ||
                !isTableRejoinable),
          );
          if (exists) {
            return;
          }
          const playerInfo = scoreBoardData.playerInfo.find(
            (p: any) => p.userId === seat._id,
          );
          const userInfo: UserProfile | null =
            await userProfileService.getUserDetailsById(
              playerInfo.userId,
            );

          if (!userInfo) {
            Logger.error(
              `INTERNAL_SERVER_ERROR seatShuffle: userInfo not found for user: ${playerInfo.userId}`,
            );
          }

          playerInfo.username = userInfo?.userName;
          playerInfo.profilePicture = userInfo?.avatarUrl;
          playerInfo.seatIndex = seat.seat;
          playerInfo.status = PLAYER_STATE.PLAYING;
          playerInfo.tenant = userInfo?.tenant;
          await playerGameplayService.setPlayerGameplay(
            playerInfo.userId,
            tableId,
            currentRound,
            { seatIndex: seat.seat },
          )
          const {
            userId,
            username,
            profilePicture,
            seatIndex,
            status,
            totalPoints,
            tenant,
          } = playerInfo;
          return {
            userId,
            username,
            profilePicture,
            seatIndex,
            status,
            totalPoints,
            tenant,
          };
        }),
      )
    ).filter(Boolean);

    const responseData = {
      tableId,
      shuffleSeats: true,
      playerInfo: playersInfo,
      toastMessage: '',
      currentRound: currentRound + 1,
    };
    Logger.info(
      `seat shuffle room event data for table: ${tableId}:${currentRound}`,
      [responseData],
    );

    socketOperation.sendEventToRoom(
      tableId,
      EVENTS.SEAT_SHUFFLE,
      responseData,
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR Error from seatShuffle table: ${tableId}:${currentRound},
      error: ${error.message}`, [error]
    );
  }
}
