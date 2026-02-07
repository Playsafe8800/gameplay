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
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableConfigurationService = void 0;
const newLogger_1 = require("../../newLogger");
const constants_1 = require("../../constants");
const tableState_1 = require("../../constants/tableState");
const utils_1 = require("../../utils");
const index_1 = require("../../utils/index");
const index_2 = require("../redisWrapper/index");
const __1 = require("..");
class TableConfiguration {
    getTableConfigurationKey() {
        return `T`;
    }
    getLobbyDetailsKey(lobbyId) {
        return `${constants_1.TABLE_PREFIX.LOBBY}:${lobbyId}`;
    }
    deleteTable(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            const isDeleted = yield (0, index_2.deleteHash)(tableId);
            newLogger_1.Logger.info(`Table configuration deletion request received ${tableId} isDeleted ${isDeleted}`);
            return isDeleted;
        });
    }
    getTableConfiguration(tableId, args) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, __1.genericGetOperation)(tableId, this.getTableConfigurationKey(), args);
        });
    }
    setTableConfiguration(tableId, tableConfigurationData, initial = false) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, __1.genericSetOperation)(tableId, this.getTableConfigurationKey(), tableConfigurationData);
            if (initial)
                yield (0, index_2.setHashExpiry)(tableId);
        });
    }
    getLobbyDetailsForMM(lobbyId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!lobbyId) {
                throw new Error(`Lobby details not set getLobbyDetailsForMM for tab e ${lobbyId}`);
            }
            const key = this.getLobbyDetailsKey(lobbyId);
            const lobbyDetails = yield (0, index_2.getValueFromKey)(key);
            return lobbyDetails;
        });
    }
    updateCurrentRound(tableId, currentRound) {
        return __awaiter(this, void 0, void 0, function* () {
            const hashKeysObj = {};
            hashKeysObj[`${this.getTableConfigurationKey()}:currentRound`] =
                currentRound;
            yield (0, index_2.saveValuesInHash)(tableId, hashKeysObj);
        });
    }
    deleteTableConfiguration(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            newLogger_1.Logger.info(`Table configuration deletion request received ${tableId}`);
            let deletekeys = [];
            const getAll = yield (0, index_2.getAllHash)(tableId);
            for (const key in getAll) {
                if (key.includes(`${this.getTableConfigurationKey()}:`))
                    deletekeys.push(key);
            }
            yield (0, index_2.deleteValueInHash)(tableId, ...deletekeys);
        });
    }
    /**
     *
     * @param LobbyTableConfig {LobbyGameConfig}
     * @param tableId pass when tableId is available (optional)
     *
     */
    getDefaultTableConfigRedisObject(LobbyTableConfig, tableId) {
        const { EntryFee, GameId, GameStartTimer, UserFinishTimer, LobbyId, ManualSplit, MaxPoints, MaxPlayers, MinPlayers, RoundShuffle, UserTurnTimer, Rake, Round_count = 2, PileDiscardCheck, isNewUI, globalMatchMaking, mmAlgo, GameFormat, cgsClusterName, CurrencyFactor = EntryFee, CurrencyId, isMultiBotEnabled } = LobbyTableConfig;
        return {
            _id: tableId || (0, utils_1.getRandomTableId)(),
            bootValue: (0, index_1.getBootValue)(EntryFee, getCurrencyType(EntryFee)),
            currencyFactor: CurrencyFactor,
            gameId: GameId,
            gameStartTimer: GameStartTimer,
            userFinishTimer: UserFinishTimer,
            lobbyId: LobbyId,
            manualSplit: ManualSplit,
            maximumPoints: MaxPoints,
            maximumSeat: MaxPlayers,
            minimumSeat: MinPlayers,
            multiWinner: false,
            pileDiscardEnabled: PileDiscardCheck,
            rakePercentage: Rake,
            currentRound: 1,
            shuffleEnabled: RoundShuffle,
            userTurnTimer: UserTurnTimer,
            isSplitable: ManualSplit,
            isNewGameTableUI: isNewUI,
            dealsCount: Round_count,
            globalMatchMaking,
            mmAlgo,
            gameType: (0, utils_1.getFormatV2)(GameFormat),
            currencyType: CurrencyId,
            cgsClusterName: cgsClusterName
                ? cgsClusterName
                : constants_1.CONFIG.CGS_NAME,
            isMultiBotEnabled
        };
    }
}
function getCurrencyType(entryFee) {
    if (entryFee === 0)
        return tableState_1.CURRENCY_TYPE.COINS;
    return tableState_1.CURRENCY_TYPE.INR;
}
exports.tableConfigurationService = new TableConfiguration();
