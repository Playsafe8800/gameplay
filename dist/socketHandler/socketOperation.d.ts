import { Socket } from 'socket.io';
declare class SocketOperation {
    sendEventToClient(socket: any, data: any, event: string): Promise<void>;
    sendEventToRoom(roomId: string, event: string, data?: any): Promise<void>;
    addClientInRoom(socket: Socket, roomId: string): Promise<void>;
    sendEventToPlayingPlayersOnly(socket: any, data: any, event: string, playerGamePlayData: any): Promise<void>;
    removeClientFromRoom(roomId: string, socketId: string): Promise<void | "">;
    getSocketFromSocketId(socketId: string): Promise<import("socket.io").RemoteSocket<import("socket.io/dist/typed-events").DefaultEventsMap>>;
}
export declare const socketOperation: SocketOperation;
export {};
