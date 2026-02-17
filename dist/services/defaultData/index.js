"use strict";
const tableState_1 = require("../../constants/tableState");
const utils_1 = require("../../utils");
class DefaultData {
    getTableGameplayData(oldTableGameplayData) {
        return {
            _id: (0, utils_1.getRandomTableId)(),
            closedDeck: [],
            currentTurn: -1,
            declarePlayer: -1,
            potValue: (oldTableGameplayData === null || oldTableGameplayData === void 0 ? void 0 : oldTableGameplayData.potValue) || 0,
            opendDeck: [],
            seats: [],
            // seats: oldTableGameplayData?.seats || [],
            tableState: (oldTableGameplayData === null || oldTableGameplayData === void 0 ? void 0 : oldTableGameplayData.tableState) ||
                tableState_1.TABLE_STATE.WAITING_FOR_PLAYERS,
            trumpCard: '',
            papluCard: '',
            dealerPlayer: -1,
            splitCount: 0,
            pointsForRoundWinner: 0,
            splitUserId: 0,
            tie: false,
            totalPlayerPoints: (oldTableGameplayData === null || oldTableGameplayData === void 0 ? void 0 : oldTableGameplayData.totalPlayerPoints) || 0,
            turnCount: 0,
            tableCurrentTimer: (oldTableGameplayData === null || oldTableGameplayData === void 0 ? void 0 : oldTableGameplayData.tableCurrentTimer) || '',
            finishPlayer: [],
            randomWinTurn: 0,
            botWinningChecked: false,
            botTurnCount: 0,
            noOfPlayers: (oldTableGameplayData === null || oldTableGameplayData === void 0 ? void 0 : oldTableGameplayData.noOfPlayers) || 0,
            rebuyableUsers: (oldTableGameplayData === null || oldTableGameplayData === void 0 ? void 0 : oldTableGameplayData.rebuyableUsers) || [],
            isRebuyable: !!(oldTableGameplayData === null || oldTableGameplayData === void 0 ? void 0 : oldTableGameplayData.isRebuyable),
            standupUsers: (oldTableGameplayData === null || oldTableGameplayData === void 0 ? void 0 : oldTableGameplayData.standupUsers) || [],
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
module.exports = defaultData;
