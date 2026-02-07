"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const productConfig_1 = __importDefault(require("../config/zk/productConfig"));
const config_1 = __importDefault(require("../config/zk/config"));
class Zookeeper {
    constructor() {
        this.configData = Object.assign(Object.assign({}, productConfig_1.default), config_1.default);
        this.getConfig = this.getConfig.bind(this);
    }
    getConfig() {
        return this.configData;
    }
}
const zookeeperObj = new Zookeeper();
exports.default = zookeeperObj;
