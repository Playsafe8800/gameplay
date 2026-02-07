"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("../routes"));
class ExpressServer {
    constructor() {
        this.app = (0, express_1.default)();
        /*
         * parsing body data request
         */
        // parse application/x-www-form-urlencoded
        this.app.use(express_1.default.urlencoded({
            limit: '50mb',
            extended: false,
            parameterLimit: 1000,
        }));
        // parse application/json
        this.app.use(express_1.default.json({ limit: '50mb' }));
        this.app.use((_req, res, next) => {
            // Website you wish to allow to connect
            res.setHeader('Access-Control-Allow-Origin', '*');
            // Request methods you wish to allow
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
            // Request headers you wish to allow
            res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
            // Set to true if you need the website to include cookies in the requests sent
            // to the API (e.g. in case you use sessions)
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            // Pass to next layer of middleware
            next();
        });
        // All index route will be handled here
        this.app.use('/', routes_1.default);
    }
}
exports.default = new ExpressServer().app;
