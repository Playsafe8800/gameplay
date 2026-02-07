"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseAppData = exports.baseTable = void 0;
const tableState_1 = require("../constants/tableState");
const index_1 = require("../constants/index");
const utils_1 = require("../utils");
function baseTable(tableData, tableGamePlay, userId) {
    const seatCount = tableGamePlay.seats.length;
    return {
        'Game Name': 'Rummy',
        'Game ID': tableData.gameId,
        'Tournament Type': 'CASH',
        'Game Format': tableData.gameType,
        Variant: tableData.maximumPoints || 'NA',
        'Start Date': tableData.gameStartTimer,
        'Entry Currency': 'CASH',
        'Cash Entry Fee': getEntryFee(tableData.currencyType, tableData.bootValue),
        'Max Players': tableData.maximumSeat,
        'Min Players': tableData.minimumSeat,
        'MM Service': 'NA',
        'MM Type': 'NA',
        'App Version Code': 'NA',
        'App Version Name': 'NA',
        'React Version': 'NA',
        'App Type': 'NA',
        'Apk Type': 'NA',
        'OS version': 'NA',
        'Phone Make': 'NA',
        'Phone Model': 'NA',
        'Rake Rate': tableData.rakePercentage,
        'Point Value': 'NA',
        'Tournament Name': 'NA',
        'Tournament Description': 'NA',
        'Tournament ID': tableData.lobbyId,
        'Deck Count': tableData.maximumSeat === 2 ? 1 : 2,
        'Table ID': tableData._id,
        'Active Players': seatCount,
        'Total Players': tableGamePlay.seats
            .map((seat) => `${seat._id}-${seat.seat}`)
            .join(','),
        'MPL User ID': userId,
        'User ID': userId,
        Country: index_1.COUNTRY.IN,
        'Level ': 'NA',
        'User Session ID': userId,
        'Round iD': tableGamePlay._id,
        'Unique ID': tableData._id,
        'Actual Battle Id': (0, utils_1.isPointsRummyFormat)(tableData.gameType)
            ? `${(0, utils_1.getIdPrefix)(tableData.gameType)}-${tableData._id}-${tableData.currentRound}`
            : `${(0, utils_1.getIdPrefix)(tableData.gameType)}-${tableData._id}`,
        'Entry Fee': getEntryFee(tableData.currencyType, tableData.bootValue),
        'Game Session ID': tableData._id,
    };
}
exports.baseTable = baseTable;
function getEntryFee(currencyType, bootValue) {
    return currencyType === tableState_1.CURRENCY_TYPE.COINS
        ? index_1.NUMERICAL.ZERO
        : bootValue;
}
function baseAppData(userAppData, tableObject) {
    let appVersionCode = 'NA';
    let reactVersion = 'NA';
    if (userAppData.userAgent) {
        const userAgentStr = userAppData.userAgent;
        const match = userAgentStr.match('^mpl-(android|ios|phonepe|pwandtv|pwamplfantasy|pwamipay|pwagojek|pwaludo)/(\\d+)\\s\\' +
            '(RV-(\\d+)\\)$');
        if (match && match[2] && match[3]) {
            appVersionCode = match[2];
            reactVersion = match[3];
        }
    }
    (tableObject['App Version Code'] = appVersionCode),
        (tableObject['React Version'] = reactVersion),
        (tableObject['App Version Name'] =
            userAppData.versionname || 'NA'),
        (tableObject['App Type'] = userAppData.apptype || 'NA');
    tableObject['Apk Type'] = userAppData.apktype || 'NA';
    tableObject['OS version'] = userAppData.osversion || 'NA';
    tableObject['Phone Make'] = userAppData.make || 'NA';
    tableObject['Phone Model'] = userAppData.model || 'NA';
}
exports.baseAppData = baseAppData;
