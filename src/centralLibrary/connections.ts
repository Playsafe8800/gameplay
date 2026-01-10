import { ClientMap, LibInitParams, ZKConfigData } from './@types';
export class CGsLib {
  static grpcClientMap: ClientMap;
  static socketClient: any;
  static zkConfig: () => ZKConfigData;
  static Logger: any;

  public static Initialize(params: LibInitParams) {
    this.grpcClientMap = params.grpcClientMap;
    this.socketClient = params.socketClient;
    this.zkConfig = params.zkConfig;
    this.Logger = params.Logger;
    this.Logger.debug('Logger is working');
  }
}
