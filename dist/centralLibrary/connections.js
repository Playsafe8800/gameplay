"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CGsLib = void 0;
class CGsLib {
    static Initialize(params) {
        this.grpcClientMap = params.grpcClientMap;
        this.socketClient = params.socketClient;
        this.zkConfig = params.zkConfig;
        this.Logger = params.Logger;
        this.Logger.debug('Logger is working');
    }
}
exports.CGsLib = CGsLib;
