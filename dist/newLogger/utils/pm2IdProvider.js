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
const pm2_1 = __importDefault(require("pm2"));
function getPm2Id() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            pm2_1.default.list((err, list) => {
                var _a, _b;
                if (err) {
                    reject(err);
                }
                else {
                    const pid = Number((_b = (_a = list.find((x) => x.pid === process.pid)) === null || _a === void 0 ? void 0 : _a.pm2_env) === null || _b === void 0 ? void 0 : _b.pm_id);
                    resolve(pid);
                }
            });
        });
    });
}
exports.default = getPm2Id;
