"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateGameCardServer = void 0;
const helpers_1 = require("../helpers");
const connections_1 = require("../../connections");
const newLogger_1 = require("../../../newLogger");
function authenticateGameCardServer(authData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let grpcReqData = {
                requestId: (0, helpers_1.getRandomUUID)(),
                authToken: authData.userAuthToken,
            };
            //This condition check is for Component Tests which executes locally
            if (process.env.SERVER_ENV === 'local') {
                grpcReqData = {
                    authToken: authData.userAuthToken,
                    requestId: authData.requestId,
                };
            }
            const GrpcClient = yield connections_1.CGsLib.grpcClientMap.getAuthServiceClient(authData.appType);
            return yield GrpcClient.authenticate().sendMessage(grpcReqData);
        }
        catch (error) {
            newLogger_1.Logger.error('INTERNAL_SERVER_ERROR _CATCH_ERROR_: in authenticateGameCardServer', error);
            return null;
        }
    });
}
exports.authenticateGameCardServer = authenticateGameCardServer;
