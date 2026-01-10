import _ from 'underscore';
import {
  GroupingSchema,
  MELD,
  TurnHistory,
  UpdateTurnDetailsSchema,
  startEndSchema,
} from '../objectModels';
import { turnHistoryService } from '../db/turnHistory';

export function getCurrentRoundHistory(
  history: TurnHistory,
  currentRound: number,
) {
  return history.history.filter(
    (e: any) => e.roundNo === currentRound,
  )[0];
}
export async function UpdateTurnDetails(
  tableId: string,
  currentRound: number,
  currentTurnData: UpdateTurnDetailsSchema,
) {
  const currentRoundHistory = await turnHistoryService.getTurnHistory(
    tableId,
    currentRound,
  );

  let latestTurnDetails = currentRoundHistory.turnsDetails.pop();

  if (!latestTurnDetails) {
    throw Error('Previous Turn Data not available to update');
  }

  latestTurnDetails = {
    ...latestTurnDetails,
    ...currentTurnData,
  };

  currentRoundHistory.turnsDetails.push(latestTurnDetails);

  turnHistoryService.setTurnHistory(
    tableId,
    currentRound,
    currentRoundHistory,
  );
}

export function replaceRoundHistory(
  history: any,
  currentRound: number,
  updatedObj: any,
) {
  const newHistory = history;
  const foundIndex = history.history.findIndex(
    (e: any) => e.roundNo === currentRound,
  );
  newHistory.history[foundIndex] = updatedObj;
  return newHistory;
}

export function formatCards(groupingCards: GroupingSchema) {
  let res: Array<any> | string = [];

  if (groupingCards.pure && groupingCards.pure.length) {
    res.push(groupingCards.pure);
  }

  if (groupingCards.seq && groupingCards.seq.length) {
    res.push(groupingCards.seq);
  }

  if (groupingCards.set && groupingCards.set.length) {
    res.push(groupingCards.set);
  }

  if (groupingCards.dwd && groupingCards.dwd.length) {
    res.push(groupingCards.dwd);
  }

  if (res.length) {
    res = _.flatten(res).join(',');
  }

  return res;
}

export function sortedCards(
  cards: Array<Array<string>>,
  meld: Array<string>,
) {
  const finalMap: startEndSchema = {
    pure: [],
    seq: [],
    set: [],
    dwd: [],
  };
  cards.forEach((currentCards, index) => {
    const currentMeld = meld[index];
    if (currentMeld === MELD.PURE) {
      finalMap.pure.push(currentCards);
    } else if (currentMeld === MELD.SEQUENCE) {
      finalMap.seq.push(currentCards);
    } else if (currentMeld === MELD.SET) {
      finalMap.set.push(currentCards);
    } else {
      finalMap.dwd.push(currentCards);
    }
  });
  return finalMap;
}
