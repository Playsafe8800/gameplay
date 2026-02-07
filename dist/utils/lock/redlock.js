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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redlock = exports.RedisLock = void 0;
const redlock_1 = __importDefault(require("redlock"));
const newLogger_1 = require("../../newLogger");
class RedisLock {
    constructor() {
        this.initializeRedlock = this.initializeRedlock.bind(this);
    }
    initializeRedlock(redisClient) {
        if (this.redlock)
            return this.redlock;
        this.redlock = new redlock_1.default([redisClient], {
            driftFactor: 0.01,
            retryCount: -1,
        });
        this.redlock.on('clientError', newLogger_1.Logger.error);
        return this.redlock;
    }
    init(redisClient) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.initializeRedlock(redisClient);
        });
    }
    get Lock() {
        return this.redlock;
    }
}
exports.RedisLock = RedisLock;
exports.redlock = new RedisLock();
