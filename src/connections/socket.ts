import newrelic = require('newrelic');
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import * as authMe from '../utils/ackMid';
import { Logger } from '../newLogger';
import server from './http';
import zk from './zk';
import { RedisClient } from 'redis';
import {
  MESSAGES,
  SOCKET,
  NUMERICAL,
  DEPLOYMENT_CONSTANTS,
} from '../constants';
import * as os from 'os';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { socketOperation } from '../socketHandler/socketOperation';
import { EVENTS } from '../constants';
import userServiceExt from '../userService';

class Socket {
  socketClient!: Server<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap
  >;
  pubClient: RedisClient;
  subClient: RedisClient;
  grpcRequestsMap: { [x: string]: number } = {};
  /**
   *
   * socket new connection callback
   */

  constructor() {
    this.connectionCB = this.connectionCB.bind(this);
    const {
      PUBSUB_REDIS_HOST,
      PUBSUB_REDIS_PORT,
      PUBSUB_REDIS_PASSWORD,
    } = zk.getConfig();
    const params = {
      host: PUBSUB_REDIS_HOST,
      port: PUBSUB_REDIS_PORT,
      ...(!!PUBSUB_REDIS_PASSWORD && {
        password: PUBSUB_REDIS_PASSWORD,
      })
    };
    this.pubClient = new RedisClient(params);
    this.pubClient.on('ready', () => {
      Logger.info('Publisher Redis Ready!');
    });
    this.subClient = this.pubClient.duplicate();
    this.subClient.on('ready', () => {
      Logger.info('Subscriber Redis Ready!');
    });

    this.pubClient.on('error', (error: any) => {
      Logger.error('pub Redis Client error : ', error);
    });
    this.subClient.on('error', (error: any) => {
      Logger.error('sub Redis Client error : ', error);
    });

    // Logging ccu every 30 seconds
    setInterval(() => {
      if (this.socketClient){
        Logger.info(
          `CCU, ${this.socketClient.engine.clientsCount}, ${DEPLOYMENT_CONSTANTS.SERVICE_NAME
          },${os.hostname()}`,
        );
        const count = this.socketClient.sockets.sockets.size;
        newrelic.recordCustomEvent('SocketHealth', {
          socketCount: count,
          timestamp: Date.now()
        });
      }
    }, 5000);
  }
  private async connectionCB(client: any) {
    const processStartTime = new Date().toISOString();
    // const cardGamesLib = await import('card-games-lib');
    const { token, AppType } = client.handshake.auth;
    Logger.info(
      `${MESSAGES.NEW_CONNECTION} socketId: ${client?.id}`,
      [
        `client.handshake.auth: `,
        client.handshake.auth,
        ` AppType: ${AppType}`,
        client.handshake
      ],
    );
    const grpcAuthRes = await userServiceExt.userAuth(token);
    const userId = grpcAuthRes?.id;

    if (userId) {
      client.userId = userId; // we will access userId from socketObject only
      Logger.info(
        `User ${userId} is authenticated .. socketId: ${client?.id}`,
      );
    } else {
      Logger.info(
        `User ${userId} is not authenticated .. socketId: ${client?.id}`,
      );
      client.disconnect();
      return;
    }
    client.data.token = token;
    client.data.AppType = AppType;
    client.use(authMe.metricsOnMid(client));

    const requestHandler = (await import('../socketHandler')).default;
    Logger.info(MESSAGES.NEW_CONNECTION, client.id);
    const processEndTime = new Date().toISOString();
    await socketOperation.sendEventToClient(
      client,
      { processStartTime, processEndTime },
      EVENTS.CONNECTION_SUCCESS,
    );
    client.use(requestHandler.bind(client));
    newrelic.recordCustomEvent('SocketEvent', {
      action: 'connected',
      socketId: client.id,
      timestamp: Date.now()
    });
    // client.conn is default menthod for ping pong request
    client.conn.on(
      SOCKET.PACKET,
      async (packet: { type: string }) => {
        if (packet.type === 'ping') {
          Logger.info('Ping received......');
        }
      },
    );

    /**
     * error event handler
     */
    client.on(SOCKET.ERROR, async (error: any) =>
      Logger.error('client error......,', error),
    );

    client.on(SOCKET.DISCONNECT, async (disc: any) => {
      Logger.info(
        'ping: disconnect-->disc: ',
        disc,
        'socket: ',
        client.id,
        `eventMetaData: `,
        client.eventMetaData,
      );
      this.DisconnectHandler(client);
      newrelic.recordCustomEvent('SocketEvent', {
        action: 'disconnected',
        socketId: client.id,
        timestamp: Date.now()
      });
    });
  }

  private async DisconnectHandler(client: any) {
    const { handleDisconnect } = await import(
      '../socketHandler/handleDisconnect'
    );
    await handleDisconnect(client);
  }

  /**
   *
   * creates socket server instance
   * called this function muliptle times will not create new instance if already created
   * @returns {SocketClient}
   */
  readonly createSocketServer = async () => {
    if (!this.socketClient) {
      const socketConfig: Partial<ServerOptions> = {
        pingInterval: NUMERICAL.TEN_THOUSAND, // to send ping/pong events for specific interval (milliseconds)
        allowEIO3: true,
      };

      this.socketClient = new Server(server, socketConfig);

      this.socketClient.adapter(
        createAdapter(this.pubClient, this.subClient, {key: `socketIo-${process.env.DEPLOYMENT_HASH}`}),
      );

      this.socketClient.on(SOCKET.CONNECTION, this.connectionCB);
    }

    return this.socketClient;
  };
}

const socket = new Socket();
export default socket;
