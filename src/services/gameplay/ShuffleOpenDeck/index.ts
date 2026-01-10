import { toast } from '../../../centralLibrary';
import { Logger } from '../../../newLogger';

import { shuffleCards } from '../../../utils/suffleCard';
import { socketOperation } from '../../../socketHandler/socketOperation';
import { EVENTS } from '../../../constants';

export async function shuffleOpenDeck({
  tableGamePlayData,
  tableId,
  currentRound,
}: shuffleOpenDeckProps) {
  Logger.info(`closed deck is shuffled.. for ${tableId}`, [
    tableGamePlayData,
  ]);

  setTopToast('', tableId);

  socketOperation.sendEventToRoom(
    tableId,
    EVENTS.CLOSED_DECK_SUFFLE_SOCKET_EVENT,
  );

  const lastCardOpendeck = tableGamePlayData.opendDeck.pop() || '';

  tableGamePlayData.closedDeck = shuffleCards(
    tableGamePlayData.opendDeck,
  );

  tableGamePlayData.opendDeck = [lastCardOpendeck];
}

function setTopToast(content: string, tableId: string) {
  toast.TopToastPopup(
    tableId,
    {
      content,
    },
    {
      apkVersion: 0,
      tableId,
      userId: `${0}`,
    },
  );
}

type shuffleOpenDeckProps = {
  tableGamePlayData: any;
  tableId: string;
  currentRound: number;
};
