import { userProfileService } from '../../db/userProfile';
import { ScoreBoardPlayerInfoData } from '../../objectModels';

class MutantService {
  async addTenantToPlayerInfo(
    playerInfo: Array<ScoreBoardPlayerInfoData>,
  ) {
    for (const player of playerInfo) {
      const playerData = await userProfileService.getUserDetailsById(
        player.userId,
      );
      player.tenant = playerData!.tenant;
    }
    return playerInfo;
  }
}

export const mutantService = new MutantService();
