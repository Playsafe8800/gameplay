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
exports.handleDisconnect = void 0;
const newLogger_1 = require("../newLogger");
function handleDisconnect(socket, error) {
    return __awaiter(this, void 0, void 0, function* () {
        newLogger_1.Logger.info(`Handling disconnect: ${socket.id}, userId: ${socket === null || socket === void 0 ? void 0 : socket.userId}`, error);
        try {
            if (socket === null || socket === void 0 ? void 0 : socket.userId) {
                // const userDetail = await userProfileService.getUserDetailsById(
                //   socket.userId,
                // );
                // const tableId = userDetail?.tableIds[0];
                // if (tableId) {
                //   Logger.info(`Lock acquired, in handleDisconnect `, [
                //     socket.userId,
                //     tableId,
                //   ]);
                //   const tableConfigData =
                //     await tableConfigurationService.getTableConfiguration(
                //       tableId, ["currentRound"]
                //     );
                //   if (!tableConfigData)
                //     throw new Error(
                //       `Table configuration not set for tableId ${tableId}`,
                //     );
                //   await leaveDisconnectedUsers(
                //     tableId,
                //     tableConfigData.currentRound,
                //   );
                // }
            }
        }
        catch (error) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR handleDisconnect:, ${socket === null || socket === void 0 ? void 0 : socket.userId}`, [error]);
        }
    });
}
exports.handleDisconnect = handleDisconnect;
