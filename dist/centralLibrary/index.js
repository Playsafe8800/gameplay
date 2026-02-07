"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Init = exports.automationSuite = exports.toast = exports.alertPopup = exports.authMe = void 0;
const AlertPopup_1 = require("./AlertPopup");
const automationSuite_1 = require("./automationSuite");
const connections_1 = require("./connections");
exports.authMe = __importStar(require("./auth-me"));
exports.alertPopup = new AlertPopup_1.AlertPopup();
exports.toast = new AlertPopup_1.ToastPopup();
exports.automationSuite = new automationSuite_1.AutomationSuite();
function Init(params) {
    connections_1.CGsLib.Initialize(params);
}
exports.Init = Init;
