import CustomError from './customError';

export class UnauthorizedError extends CustomError {}

export class WalletNotFoundError extends CustomError {}

export class InsufficientFundError extends CustomError {}

export class UnknownError extends CustomError {}
export class InternalError extends CustomError {}

export class TurnMismatchError extends CustomError {}

export class CacheDataMismatchFound extends CustomError {}

export class CancelBattleError extends CustomError {}

export class FraudError extends CustomError {}

export class StateError extends CustomError {}

export class MultiAccountError extends CustomError {}
