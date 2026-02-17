"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const newLogger_1 = require("../../newLogger");
const connections_1 = require("../../connections");
const constants_1 = require("../../constants");
const poolTypes_1 = require("../../constants/poolTypes");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const date_1 = require("../../utils/date");
const index_1 = require("../../utils/index");
const cardHandler_1 = require("../gameplay/cardHandler");
class GameTableInfo {
    formatGameTableInfo(tableConfigData, tableGamePlayData, userProfileData, playerGameplayData, currentPlayer, turnHistorydata) {
        var _a, _b, _c, _d;
        const seatLength = userProfileData.length;
        const { tableState } = tableGamePlayData;
        const playerInfo = this.getPlayerInfo(playerGameplayData, userProfileData, tableConfigData.maximumPoints, tableGamePlayData, tableConfigData.gameType, tableConfigData._id, tableConfigData.maximumSeat);
        const tableSessionId = currentPlayer === null || currentPlayer === void 0 ? void 0 : currentPlayer.tableSessionId;
        const unitySessionId = ((_a = userProfileData.find((upd) => upd.id === (currentPlayer === null || currentPlayer === void 0 ? void 0 : currentPlayer.userId))) === null || _a === void 0 ? void 0 : _a.unitySessionId) || '';
        //this.getPlayerInfo(seatLength, usersData, tableConfigData, tableGamePlayData);
        if (!(0, index_1.isPointsRummyFormat)(tableConfigData.gameType))
            if (!currentPlayer)
                throw new Error(`Current user not present`);
        let timer = 0;
        if (tableState === constants_1.TABLE_STATE.ROUND_TIMER_STARTED ||
            tableState === constants_1.TABLE_STATE.LOCK_IN_PERIOD ||
            tableState === constants_1.TABLE_STATE.ROUND_STARTED ||
            tableState === constants_1.TABLE_STATE.DECLARED) {
            const currentTime = new Date(); // current timestamp
            const diffInSec = Math.ceil((new Date(tableGamePlayData.tableCurrentTimer).valueOf() -
                new Date(currentTime).valueOf()) /
                constants_1.NUMERICAL.THOUSAND);
            timer = diffInSec > 0 ? diffInSec : 0;
        }
        let roundFinishedUserIds = [];
        if (tableState === constants_1.TABLE_STATE.DECLARED) {
            const declarePlayerData = playerGameplayData.find((p) => p.userId === (tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.declarePlayer));
            if (declarePlayerData) {
                roundFinishedUserIds.push(declarePlayerData.userId);
            }
            if (((_b = tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.finishPlayer) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                roundFinishedUserIds = [];
                playerGameplayData.forEach((pgp) => {
                    if ((pgp === null || pgp === void 0 ? void 0 : pgp.userId) &&
                        pgp.userStatus === constants_1.PLAYER_STATE.PLAYING) {
                        roundFinishedUserIds.push(pgp.userId);
                    }
                });
            }
        }
        let tenantToSend = '';
        const tenants = userProfileData.map((userData) => {
            if (userData.tenant === constants_1.CONFIG.MUTANT_APPTYPE) {
                tenantToSend = userData.tenant;
            }
            return userData.tenant;
        });
        const data = {
            tableId: tableConfigData._id,
            availablePlayers: seatLength,
            gameType: tableConfigData.gameType,
            tableState,
            wildCard: tableGamePlayData.trumpCard
                ? tableGamePlayData.trumpCard
                : '',
            papluCard: tableGamePlayData.papluCard,
            openDeck: tableGamePlayData.opendDeck,
            totalRounds: tableConfigData.dealsCount,
            currentTurn: tableGamePlayData.currentTurn,
            dealer: tableGamePlayData.dealerPlayer,
            currencyType: tableConfigData.currencyType,
            declarePlayer: tableGamePlayData.declarePlayer,
            potValue: tableGamePlayData.potValue || 0,
            lobbyId: tableConfigData.lobbyId,
            playerInfo: playerInfo,
            group: (currentPlayer === null || currentPlayer === void 0 ? void 0 : currentPlayer.groupingCards) || [],
            meld: currentPlayer
                ? cardHandler_1.cardHandler.labelTheMeld({
                    meld: currentPlayer.meld,
                    cardsGroup: currentPlayer.groupingCards,
                })
                : [],
            isRebuyApplicable: Boolean((_c = tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.rebuyableUsers) === null || _c === void 0 ? void 0 : _c.find((user) => user === (currentPlayer === null || currentPlayer === void 0 ? void 0 : currentPlayer.userId))),
            canPickWildcard: !tableGamePlayData.turnCount,
            roundFinishedUserIds: roundFinishedUserIds || [],
            turnTimer: date_1.dateUtils.addEpochTimeInSeconds(timer),
            currentRound: tableConfigData.currentRound,
            lastGreyOutCard: (turnHistorydata === null || turnHistorydata === void 0 ? void 0 : turnHistorydata.lastPickCard) || '',
            isLastScoreBoardEnabled: tableConfigData.currentRound !== 1,
            entryFee: tableConfigData.bootValue,
            tableSessionId,
            unitySessionId,
            networkParams: currentPlayer === null || currentPlayer === void 0 ? void 0 : currentPlayer.networkParams,
            maxScore: tableConfigData.maximumPoints === poolTypes_1.POOL_TYPES.SIXTY_ONE
                ? constants_1.POINTS.MAX_DEADWOOD_POINTS_61
                : constants_1.POINTS.MAX_DEADWOOD_POINTS,
            tenant: tenantToSend,
            standUpUserList: ((_d = tableGamePlayData === null || tableGamePlayData === void 0 ? void 0 : tableGamePlayData.standupUsers) === null || _d === void 0 ? void 0 : _d.length)
                ? tableGamePlayData.standupUsers.map((au) => au._id)
                : [],
            showMplWalletInGame: connections_1.zk.getConfig().SHOW_MPL_WALLET_IN_GAME,
        };
        return data;
    }
    getPlayerInfo(playerGameplayData, userProfileData, maximumPoints, tableGamePlayData, gameType, 
    // currentUser: PlayerGameplay,
    tableId, maximumSeat) {
        var _a;
        const playerInfo = [];
        for (let i = 0; i < userProfileData.length; ++i) {
            const currentUserProfileData = userProfileData[i];
            const currentPlayerGameplay = playerGameplayData[i];
            if (!currentPlayerGameplay ||
                (currentPlayerGameplay === null || currentPlayerGameplay === void 0 ? void 0 : currentPlayerGameplay.userStatus) === constants_1.PLAYER_STATE.LEFT)
                continue;
            let userStatus = constants_1.PLAYER_STATE.PLAYING;
            if (currentPlayerGameplay.points > 0) {
                userStatus = currentPlayerGameplay.userStatus.toLowerCase();
            }
            // if (currentPlayerGameplay.dealPoint >= maximumPoints) {
            //   userStatus = PLAYER_STATE.ELIMINATED;
            // }
            const currentSeatIndex = (_a = tableGamePlayData.seats.find((val) => val.userId === currentUserProfileData.id)) === null || _a === void 0 ? void 0 : _a.seat;
            const userCashObj = ((currentUserProfileData === null || currentUserProfileData === void 0 ? void 0 : currentUserProfileData.userTablesCash) &&
                currentUserProfileData.userTablesCash.find((utc) => utc.tableId === tableId)) || { userCash: 0 };
            const currentPlayerInfo = {
                userId: currentPlayerGameplay.userId,
                prime: currentUserProfileData.isPrime,
                seatIndex: currentSeatIndex || currentPlayerGameplay.seatIndex,
                username: currentUserProfileData.userName,
                profilePicture: currentUserProfileData.avatarUrl,
                status: userStatus,
                isShowTimeOutMsg: false,
                splitStatus: false,
                totalPoints: currentPlayerGameplay.dealPoint,
                isAutoDrop: currentPlayerGameplay.isAutoDrop,
                dropGame: (0, index_1.getDropPoints)(currentPlayerGameplay
                    ? currentPlayerGameplay.isFirstTurn
                    : false, maximumPoints, gameType, maximumSeat),
                tenant: currentUserProfileData.tenant,
                userCash: userCashObj.userCash,
            };
            playerInfo.push(currentPlayerInfo);
        }
        return playerInfo;
    }
    getTableInfo(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { tableId } = payload;
                const config = connections_1.zk.getConfig();
                const tableData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                    'maximumSeat',
                    'minimumSeat',
                    'dealsCount',
                    'gameType',
                    'currencyFactor',
                ]);
                const response = {
                    success: true,
                    tableId,
                    maxTimeout: config.MAX_TIMEOUT,
                    decks: tableData.maximumSeat === constants_1.NUMERICAL.TWO
                        ? constants_1.NUMERICAL.ONE
                        : constants_1.NUMERICAL.TWO,
                    minimumPlayers: tableData.minimumSeat,
                    totalRounds: tableData.dealsCount,
                };
                if ((0, index_1.isPointsRummyFormat)(tableData.gameType)) {
                    response.firstDrop =
                        tableData.currencyFactor * constants_1.POINTS.FIRST_DROP;
                    response.middleDrop =
                        tableData.currencyFactor * constants_1.POINTS.MIDDLE_DROP;
                }
                return response;
            }
            catch (error) {
                newLogger_1.Logger.error('INTERNAL_SERVER_ERROR ERROR_EVENT getTableInfo', [error]);
                return {
                    success: false,
                    tableId: payload.tableId,
                };
            }
        });
    }
}
const gameTableInfo = new GameTableInfo();
module.exports = gameTableInfo;
