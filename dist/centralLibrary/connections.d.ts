import { ClientMap, LibInitParams, ZKConfigData } from './@types';
export declare class CGsLib {
    static grpcClientMap: ClientMap;
    static socketClient: any;
    static zkConfig: () => ZKConfigData;
    static Logger: any;
    static Initialize(params: LibInitParams): void;
}
