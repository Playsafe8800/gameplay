declare class Modules {
    readonly HTTP_SERVER_PORT: number;
    readonly SERVER_TYPE: string;
    readonly SERVER_ENV: string;
    readonly CONFIG_CLUSTER: string;
    readonly isZkConfigUse: boolean;
    readonly currentIndexForServicesOfGRPC: {
        [x: string]: number;
    };
    readonly GRPC_SERVER_PORT: number;
    constructor();
}
declare const modules: Modules;
export default modules;
