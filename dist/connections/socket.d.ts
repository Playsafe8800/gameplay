import { Server } from 'socket.io';
import { RedisClient } from 'redis';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
declare class Socket {
    socketClient: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>;
    pubClient: RedisClient;
    subClient: RedisClient;
    grpcRequestsMap: {
        [x: string]: number;
    };
    /**
     *
     * socket new connection callback
     */
    constructor();
    private connectionCB;
    private DisconnectHandler;
    /**
     *
     * creates socket server instance
     * called this function muliptle times will not create new instance if already created
     * @returns {SocketClient}
     */
    readonly createSocketServer: () => Promise<Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>>;
}
declare const socket: Socket;
export default socket;
