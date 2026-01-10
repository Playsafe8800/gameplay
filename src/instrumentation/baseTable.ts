import { CURRENCY_TYPE } from '../constants/tableState';
import { COUNTRY, NUMERICAL } from '../constants/index';
import { getIdPrefix, isPointsRummyFormat } from '../utils';

export function baseTable(
  tableData: any,
  tableGamePlay: any,
  userId: number,
) {
  const seatCount = tableGamePlay.seats.length;
  return {
    'Game Name': 'Rummy',
    'Game ID': tableData.gameId,
    'Tournament Type': 'CASH',
    'Game Format': tableData.gameType,
    Variant: tableData.maximumPoints || 'NA',
    'Start Date': tableData.gameStartTimer,
    'Entry Currency': 'CASH',
    'Cash Entry Fee': getEntryFee(
      tableData.currencyType,
      tableData.bootValue,
    ),
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
      .map((seat: any) => `${seat._id}-${seat.seat}`)
      .join(','),
    'MPL User ID': userId,
    'User ID': userId,
    Country: COUNTRY.IN,
    'Level ': 'NA',
    'User Session ID': userId,
    'Round iD': tableGamePlay._id,
    'Unique ID': tableData._id,
    'Actual Battle Id': isPointsRummyFormat(tableData.gameType)
      ? `${getIdPrefix(tableData.gameType)}-${tableData._id}-${
          tableData.currentRound
        }`
      : `${getIdPrefix(tableData.gameType)}-${tableData._id}`,
    'Entry Fee': getEntryFee(
      tableData.currencyType,
      tableData.bootValue,
    ),
    'Game Session ID': tableData._id,
  };
}

function getEntryFee(
  currencyType: string,
  bootValue: number,
): number {
  return currencyType === CURRENCY_TYPE.COINS
    ? NUMERICAL.ZERO
    : bootValue;
}

export function baseAppData(userAppData, tableObject) {
  let appVersionCode = 'NA';
  let reactVersion = 'NA';
  if (userAppData.userAgent) {
    const userAgentStr = userAppData.userAgent;
    const match = userAgentStr.match(
      '^mpl-(android|ios|phonepe|pwandtv|pwamplfantasy|pwamipay|pwagojek|pwaludo)/(\\d+)\\s\\' +
        '(RV-(\\d+)\\)$',
    );
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
