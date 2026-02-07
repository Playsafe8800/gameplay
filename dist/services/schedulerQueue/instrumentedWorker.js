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
exports.createInstrumentedWorker = void 0;
const bullmq_1 = require("bullmq");
function createInstrumentedWorker(queueName, processor, opts) {
    const wrappedProcessor = (job) => __awaiter(this, void 0, void 0, function* () {
        // Directly execute the provided processor without New Relic instrumentation
        return processor(job);
    });
    return new bullmq_1.Worker(queueName, wrappedProcessor, opts);
}
exports.createInstrumentedWorker = createInstrumentedWorker;
