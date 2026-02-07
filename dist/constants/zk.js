"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZK = void 0;
exports.ZK = Object.freeze({
    SERVER_CONFIG: 'config',
    PRODUCT_CONFIG: 'product-config',
    IPs: process.env.ZK_CUSTOM_IPS || '',
    SERVER_CONFIG_PATH: '/mpl/rummy-multi-table-node/config',
    PRODUCT_CONFIG_PATH: '/mpl/rummy-multi-table-node/product-config',
});
