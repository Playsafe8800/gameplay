import { TABLE_STATE } from '../../constants/tableState';
import { getRandomTableId } from '../../utils';

class DefaultData {
  getTableGameplayData(
    oldTableGameplayData,
  ) {
    return {
      _id: getRandomTableId(),
      closedDeck: [],
      currentTurn: -1,
      declarePlayer: -1,
      potValue: oldTableGameplayData?.potValue || 0,
      opendDeck: [],
      seats: [],
      // seats: oldTableGameplayData?.seats || [],
      tableState:
        oldTableGameplayData?.tableState ||
        TABLE_STATE.WAITING_FOR_PLAYERS,
      trumpCard: '',
      papluCard: '',
      dealerPlayer: -1,
      splitCount: 0,
      pointsForRoundWinner: 0,
      splitUserId: 0,
      tie: false,
      totalPlayerPoints: oldTableGameplayData?.totalPlayerPoints || 0,
      turnCount: 0,
      tableCurrentTimer:
        oldTableGameplayData?.tableCurrentTimer || '',
      finishPlayer: [],
      randomWinTurn: 0,
      botWinningChecked: false,
      botTurnCount: 0,
      noOfPlayers: oldTableGameplayData?.noOfPlayers || 0,
      rebuyableUsers: oldTableGameplayData?.rebuyableUsers || [],
      isRebuyable: !!oldTableGameplayData?.isRebuyable,
      standupUsers: oldTableGameplayData?.standupUsers || [],
    };
  }

  defaultFinishBattleResData(grpcReqData) {
    return {
      playersData: grpcReqData.score.map((score) => ({
        requestId: score.requestId,
        battleId: score.battleId,
        userId: score.userId,
        canPlayAgain: false,
        nextLobbySuggestedConfig: '',
        nextSuggestedLobby: null,
        decimalScore: score.decimalScore,
      })),
      isSuccess: true,
      error: null,
      battlePlayAgainDisabled: false,
      collusionInfo: null,
      isFinalRound: false,
    };
  }
}

const defaultData = new DefaultData();

export = defaultData;
