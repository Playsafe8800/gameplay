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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconnectTable = void 0;
const newLogger_1 = require("../../newLogger");
const connections_1 = require("../../connections");
const constants_1 = require("../../constants");
const playerGameplay_1 = require("../../db/playerGameplay");
const tableConfiguration_1 = require("../../db/tableConfiguration");
const tableGameplay_1 = require("../../db/tableGameplay");
const turnHistory_1 = require("../../db/turnHistory");
const userProfile_1 = require("../../db/userProfile");
const socketOperation_1 = require("../../socketHandler/socketOperation");
const utils_1 = require("../../utils");
const split_1 = require("../split");
const userService_1 = require("../userService");
const gameTableInfo_1 = __importDefault(require("./gameTableInfo"));
const tableOperation_1 = require("./tableOperation");
function reconnectTable(socket, connectionType) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = socket;
            // Create or find user
            const userData = yield userService_1.userService.findOrCreateUser(userId, socket.id, (_a = socket.handshake) === null || _a === void 0 ? void 0 : _a.headers, socket.data.AppType);
            // Get all tableIds
            const prevGameTableIds = (userData === null || userData === void 0 ? void 0 : userData.tableIds.slice(-1)) || [];
            newLogger_1.Logger.info(`prevGameTableIds: ${userId} >> ${userData === null || userData === void 0 ? void 0 : userData.tableIds}`);
            // Get GTI data from tableId
            const gtiData = (yield Promise.all(prevGameTableIds.map((singleTableId) => __awaiter(this, void 0, void 0, function* () {
                return yield getReconnectionTableData(userData, singleTableId, socket);
            })))).filter(Boolean);
            if (prevGameTableIds.length === 0 || gtiData.length === 0) {
                // Find a new table
            }
            // let finalGTIData: any[] = gtiData;
            // // check if user is alone on some table
            // if (connectionType === CONNECTION_TYPE.REJOIN) {
            //   finalGTIData = [];
            //   for (let i = 0; i < gtiData.length; i++) {
            //     const currentGTIData = gtiData[i];
            //     if (
            //       currentGTIData.tableState ===
            //         TABLE_STATE.WAITING_FOR_PLAYERS ||
            //       currentGTIData.tableState ===
            //         TABLE_STATE.ROUND_TIMER_STARTED
            //     ) {
            //       await LeaveTableHandler.main(
            //         {
            //           reason: LEAVE_TABLE_REASONS.AUTO_REMOVABLE_TABLE,
            //           tableId: currentGTIData.tableId,
            //         },
            //         userId,
            //       );
            //     } else {
            //       finalGTIData.push(currentGTIData);
            //     }
            //   }
            // }
            const response = {
                signupResponse: {
                    userId: userData.id,
                    username: userData.userName,
                    profilePicture: userData.avatarUrl,
                    tenant: userData.tenant,
                },
                gameTableInfoData: gtiData,
            };
            return response;
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at reconnect table handler`, [
                error,
            ]);
            throw error;
        }
    });
}
exports.reconnectTable = reconnectTable;
function getReconnectionTableData(userData, tableId, socket) {
    return __awaiter(this, void 0, void 0, function* () {
        newLogger_1.Logger.info(`getReconnectionTableData >> table: ${tableId}`);
        let tableGameData;
        let playerGameData;
        const tableData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
            'currentRound',
        ]);
        newLogger_1.Logger.info(`getReconnectionTableData: ${tableId}, tableConfig: `, [
            tableData,
        ]);
        if (!tableData) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR getReconnectionTableData: tableConfigData not found for ${tableId}`);
            return;
        }
        if (tableData) {
            [tableGameData, playerGameData] = yield Promise.all([
                tableGameplay_1.tableGameplayService.getTableGameplay(tableId, tableData.currentRound, ['tableState']),
                playerGameplay_1.playerGameplayService.getPlayerGameplay(userData.id, tableId, tableData.currentRound, [
                    'userId',
                    'tableSessionId',
                    'meld',
                    'groupingCards',
                    'networkParams',
                    'userStatus',
                ]),
            ]);
        }
        newLogger_1.Logger.info(`getReconnectionTableData: ${tableId}, TGP, PGP: `, [
            tableGameData,
            playerGameData,
        ]);
        if (!tableGameData) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR getReconnectionTableData: TGP / PGP not found for ${tableId}!`);
            return;
        }
        let gtiData;
        if (tableData &&
            (tableGameData === null || tableGameData === void 0 ? void 0 : tableGameData.tableState) !== constants_1.TABLE_STATE.WINNER_DECLARED &&
            (tableGameData === null || tableGameData === void 0 ? void 0 : tableGameData.tableState) !== constants_1.TABLE_STATE.PLAY_MORE &&
            (playerGameData === null || playerGameData === void 0 ? void 0 : playerGameData.userStatus) !== constants_1.PLAYER_STATE.LEFT) {
            // Get rejoin user GTI data
            gtiData = yield rejoinUser(socket, tableId, userData, playerGameData);
        }
        if (tableData &&
            ((tableGameData === null || tableGameData === void 0 ? void 0 : tableGameData.tableState) === constants_1.TABLE_STATE.WINNER_DECLARED ||
                (tableGameData === null || tableGameData === void 0 ? void 0 : tableGameData.tableState) === constants_1.TABLE_STATE.PLAY_MORE) &&
            (playerGameData === null || playerGameData === void 0 ? void 0 : playerGameData.userStatus) === constants_1.PLAYER_STATE.LEFT) {
            // instrumentation call
            // userGameRejoin({
            //   tableData,
            //   tableGamePlay: tableGameData,
            //   userId: userData.id,
            //   isJoined: false,
            //   reason: INSTRUMENTATION_EVENT_REASONS.GAME_ENDED_BEFORE_REJOIN,
            // });
        }
        return gtiData;
    });
}
function rejoinUser(socket, tableId, userData, playerGameplayData) {
    return __awaiter(this, void 0, void 0, function* () {
        newLogger_1.Logger.info(`rejoinUser: ${tableId}`, [
            userData,
            playerGameplayData,
        ]);
        try {
            const tableConfigurationData = yield tableConfiguration_1.tableConfigurationService.getTableConfiguration(tableId, [
                '_id',
                'gameType',
                'maximumPoints',
                'rebuyUsed',
                'maximumSeat',
                'maximumSeat',
                'dealsCount',
                'currencyType',
                'lobbyId',
                'currentRound',
                'bootValue',
            ]);
            const { currentRound } = tableConfigurationData;
            const tableGameplayData = yield tableGameplay_1.tableGameplayService.getTableGameplay(tableId, currentRound, [
                'tableState',
                'standupUsers',
                'turnCount',
                'rebuyableUsers',
                'potValue',
                'declarePlayer',
                'dealerPlayer',
                'currentTurn',
                'opendDeck',
                'trumpCard',
                'finishPlayer',
                'tableCurrentTimer',
                'seats',
            ]);
            let turnObject;
            const currentRoundHistory = yield turnHistory_1.turnHistoryService.getTurnHistory(tableId, currentRound);
            if (currentRoundHistory) {
                turnObject =
                    currentRoundHistory.turnsDetails[currentRoundHistory.turnsDetails.length - 1];
            }
            if (!tableGameplayData) {
                throw new Error(`Table game play doesn't exist rejoinUser ${tableId}`);
            }
            newLogger_1.Logger.info(`rejoinUser: >> `, [
                tableConfigurationData,
                tableGameplayData,
            ]);
            const filteredSeats = tableGameplayData.seats.filter((seat) => seat._id);
            const promiseList = filteredSeats.map((seat) => userProfile_1.userProfileService.getOrCreateUserDetailsById(seat._id));
            const promiseListPGP = filteredSeats.map((seat) => playerGameplay_1.playerGameplayService.getPlayerGameplay(seat._id, tableId, tableConfigurationData.currentRound, [
                'userId',
                'userStatus',
                'points',
                'seatIndex',
                'dealPoint',
                'isAutoDrop',
                'isFirstTurn',
            ]));
            const usersData = yield Promise.all(promiseList);
            const playerGameplayDataUsers = yield Promise.all(promiseListPGP);
            /**
             * Play more is the last state of tale
             * If game is finished, then send GTI event with play more key set to true
             */
            if (connections_1.zk.getConfig().PLAYMORE &&
                tableGameplayData.tableState === constants_1.TABLE_STATE.PLAY_MORE) {
                userData.playMore = true;
            }
            // JOINS PLAYER TO SOCKET ROOM
            tableOperation_1.tableOperation.addPlayerInTable(socket, {
                tableId,
                usersData,
                maximumSeat: tableConfigurationData === null || tableConfigurationData === void 0 ? void 0 : tableConfigurationData.maximumSeat,
            });
            const gtiData = gameTableInfo_1.default.formatGameTableInfo(tableConfigurationData, tableGameplayData, usersData, playerGameplayDataUsers, playerGameplayData, {
                lastPickCard: turnObject &&
                    turnObject.cardPickSource === constants_1.TURN_HISTORY.OPENED_DECK
                    ? turnObject.cardPicked
                    : '',
            });
            gtiData.split = false;
            if (!(0, utils_1.isPointsRummyFormat)(tableConfigurationData.gameType)) {
                const activeSplitData = yield tableGameplay_1.tableGameplayService.getSplitRequest(tableId);
                // this represents whether the table is eligible for split and no one has actually done split
                if (activeSplitData) {
                    socketOperation_1.socketOperation.sendEventToRoom(tableId, constants_1.EVENTS.SPLIT_INFORMATION, activeSplitData);
                }
                else {
                    const isSplitable = yield split_1.splitHandler.isTableSplitable(playerGameplayDataUsers, tableConfigurationData);
                    if (isSplitable &&
                        isSplitable.splitType &&
                        tableGameplayData.tableState ===
                            constants_1.TABLE_STATE.ROUND_TIMER_STARTED)
                        gtiData.split = true;
                }
            }
            // instrumentation call
            // userGameRejoin({
            //   tableData: tableConfigurationData,
            //   tableGamePlay: tableGameplayData,
            //   userId: userData.id, // TODO: pass only userId
            //   isJoined: true,
            //   reason: INSTRUMENTATION_EVENT_REASONS.REJOINED_SUCCESSFULLY,
            // });
            return gtiData;
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR rejoinUser: > ${tableId}`, [
                userData,
                playerGameplayData,
                error,
            ]);
            return null;
        }
    });
}
