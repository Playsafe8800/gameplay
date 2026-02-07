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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
const loggerUtils_1 = require("./utils/loggerUtils");
const winston_loki_1 = __importDefault(require("winston-loki"));
class Logger {
    /**
     * @description Initializes Winston logger. Will pick all required config from `/opt/service-config/logger-config.json`
     */
    static initializeLogger() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (Logger.isInitialized) {
                    return;
                }
                Logger.logger = winston_1.default.createLogger({
                    level: "info",
                    // Use default JSON format at the base logger; transports have their own formatting below
                    format: winston_1.default.format.json(),
                    transports: [
                        new winston_1.default.transports.Console({
                            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.printf((_a) => {
                                var { timestamp, level, message } = _a, meta = __rest(_a, ["timestamp", "level", "message"]);
                                return `[${timestamp}] [${level}] - ${message} - ${JSON.stringify(meta)}`;
                            })),
                        }),
                        new winston_loki_1.default({
                            host: "http://grafana.trustgaming.com:3100",
                            labels: { app: `gameplay-service-${process.env.NODE_ENV}` },
                            json: true,
                            batching: true,
                            interval: 5,
                            replaceTimestamp: true,
                            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp(), winston_1.default.format.printf((_a) => {
                                var { timestamp, level, message } = _a, meta = __rest(_a, ["timestamp", "level", "message"]);
                                return `[${timestamp}] [${level}] ${message} ${JSON.stringify(meta)}`;
                            })),
                            onConnectionError: (err) => console.error("Loki connection error:", err),
                        })
                    ],
                });
                Logger.isInitialized = true;
            }
            catch (error) {
                console.error('Error initializing Winston logger: ', [error]);
                throw error;
            }
        });
    }
    static warn(...messages) {
        Logger.logger.warn((0, loggerUtils_1.formatLogMessages)(messages));
    }
    static info(...messages) {
        Logger.logger.info((0, loggerUtils_1.formatLogMessages)(messages));
    }
    static debug(...messages) {
        Logger.logger.debug((0, loggerUtils_1.formatLogMessages)(messages));
    }
    static error(...messages) {
        Logger.logger.error(messages);
    }
    static printLogs() {
        Logger.logger.error('TEST LOGS');
        Logger.logger.debug('TEST LOGS');
        Logger.logger.info('TEST LOGS');
        Logger.logger.warn('TEST LOGS');
        return 'OK';
    }
}
exports.Logger = Logger;
