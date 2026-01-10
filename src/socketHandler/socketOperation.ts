import { Logger } from '../newLogger';
import { Socket } from 'socket.io';
import * as authMe from '../utils/ackMid';
import { socket as socketConn } from '../connections';
import { PlayerGameplay } from '../objectModels';
import { PLAYER_STATE } from '../constants';

class SocketOperation {
  async sendEventToClient(socket: any, data: any, event: string) {
    try {
      // send event f
      const responseObj = {
        en: event,
        data,
      };
      if (typeof socket !== 'string')
        socket.emit(
          event,
          authMe.metricsEmitMid(responseObj, '', true),
          (res: any) => {
            Logger.info(
              `Client ack received for event: ${data.en}  res: `,
              [res],
            );
          },
        );
      else
        socketConn.socketClient.to(socket).emit(
          event,
          authMe.metricsEmitMid(responseObj, ''),
          // (res: any) => {
          //   Logger.info(
          //     `Client ack received for event: ${data.en}  res: `,
          //     res,
          //   );
          // },
        );
      Logger.info(
        `SEND_EVENT TO CLIENT for table: ${data?.tableId} socket: ${typeof socket === 'string' ? socket : socket?.id
        }`,
        responseObj,
      );
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR sendEventToClient:, ${error.message}`, [error]);
    }
  }

  async sendEventToRoom(
    roomId: string,
    event: string,
    data: any = {},
  ) {
    try {
      const responseObj = {
        en: event,
        data,
      };

      socketConn.socketClient
        .to(roomId)
        .emit(event, authMe.metricsEmitMid(responseObj));

      Logger.info(`SEND_EVENT TO ROOM for table: ${roomId}`, [
        responseObj,
      ]);
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR sendEventToRoom: ${roomId}`, [data, error]);
    }
  }

  async addClientInRoom(socket: Socket, roomId: string) {
    try {
      Logger.info('Socket Joined to room >>>', [roomId]);
      return socket.join(roomId);
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR addClientInRoom: ${roomId}, ${error.message}`);
      return undefined;
    }
  }

  async sendEventToPlayingPlayersOnly(
    socket: any,
    data: any,
    event: string,
    playerGamePlayData: any,
  ) {
    try {
      if (playerGamePlayData?.userStatus === PLAYER_STATE.LEFT) {
        Logger.info(
          `${event} Trapped for user: ${playerGamePlayData.userId} because user Left the table`,
        );
        return;
      }

      this.sendEventToClient(socket, data, event);
    } catch (err) {
      Logger.error(`INTERNAL_SERVER_ERROR sendEventToPlayingPlayersOnly`, [err]);
    }
  }

  async removeClientFromRoom(roomId: string, socketId: string) {
    try {
      Logger.info('removeClientFromRoom', [roomId, socketId]);
      const socket =
        socketConn.socketClient.sockets.sockets.get(socketId);
      return socket ? socket.leave(roomId) : '';
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR removeClientFromRoom: ${roomId}, ${error.message}`,
      );
    }
  }

  async getSocketFromSocketId(socketId: string) {
    // return socketConn.socketClient.sockets.sockets.get(socketId);
    const [socket] = await socketConn.socketClient
      .in(socketId)
      .fetchSockets();
    return socket;
  }
}

export const socketOperation = new SocketOperation();
