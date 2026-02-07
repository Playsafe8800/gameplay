"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAccountError = exports.StateError = exports.FraudError = exports.CancelBattleError = exports.CacheDataMismatchFound = exports.TurnMismatchError = exports.InternalError = exports.UnknownError = exports.InsufficientFundError = exports.WalletNotFoundError = exports.UnauthorizedError = void 0;
const customError_1 = __importDefault(require("./customError"));
class UnauthorizedError extends customError_1.default {
}
exports.UnauthorizedError = UnauthorizedError;
class WalletNotFoundError extends customError_1.default {
}
exports.WalletNotFoundError = WalletNotFoundError;
class InsufficientFundError extends customError_1.default {
}
exports.InsufficientFundError = InsufficientFundError;
class UnknownError extends customError_1.default {
}
exports.UnknownError = UnknownError;
class InternalError extends customError_1.default {
}
exports.InternalError = InternalError;
class TurnMismatchError extends customError_1.default {
}
exports.TurnMismatchError = TurnMismatchError;
class CacheDataMismatchFound extends customError_1.default {
}
exports.CacheDataMismatchFound = CacheDataMismatchFound;
class CancelBattleError extends customError_1.default {
}
exports.CancelBattleError = CancelBattleError;
class FraudError extends customError_1.default {
}
exports.FraudError = FraudError;
class StateError extends customError_1.default {
}
exports.StateError = StateError;
class MultiAccountError extends customError_1.default {
}
exports.MultiAccountError = MultiAccountError;
