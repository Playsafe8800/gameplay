"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Modules {
    constructor() {
        this.HTTP_SERVER_PORT =
            Number(process.argv[2]) || Number(process.env.port) || 5001;
        this.SERVER_TYPE = process.argv[3]
            ? process.argv[3].toUpperCase()
            : 'SOCKET';
        this.SERVER_ENV = process.argv[4] || 'local';
        this.GRPC_SERVER_PORT =
            Number(process.argv[5]) ||
                Number(process.env.GRPC_SERVER_PORT) ||
                50102;
        this.CONFIG_CLUSTER = ''; // process.env.CONFIG_CLUSTER; // cluster1/cluster2/default
        this.isZkConfigUse = this.SERVER_ENV === 'local';
        this.currentIndexForServicesOfGRPC = {};
    }
}
const modules = new Modules();
exports.default = modules;
