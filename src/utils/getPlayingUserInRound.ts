import { PlayerGameplay } from '../objectModels';
import { PLAYER_STATE } from '../constants';

export function getPlayingUserInRound(
  players: any[],
  play?: boolean,
) {
  return players.filter(
    (player) =>
      player.userStatus !== PLAYER_STATE.LEFT &&
      (!play || player.userStatus === PLAYER_STATE.PLAYING),
  );
}
