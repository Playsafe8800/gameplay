import { socketOperation } from '../../socketHandler/socketOperation';
import { EVENTS } from '../../constants';
import { Logger } from '../../newLogger';

class EmoJi {
  async send(
    userId: number,
    tableId: string,
    emojiId: number,
  ): Promise<void> {
    try {
      if (!tableId || !userId || typeof emojiId === 'undefined') {
        throw new Error(
          `data missing on emoji send ${userId}|${tableId}|${emojiId}`,
        );
      }
      await socketOperation.sendEventToRoom(
        tableId,
        EVENTS.SET_EMOJI,
        {
          userId,
          emojiId,
          tableId,
        },
      );
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error found on emoji send ${userId}|${tableId}|${emojiId},
        error: ${error.message}`,
        [error],
      );
    }
  }
}

export = new EmoJi();
