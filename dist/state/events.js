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
exports.eventStateManager = void 0;
const index_1 = require("../db/state/index");
const xstate_1 = require("xstate");
const machine_1 = require("./machine");
class EventManager {
    createState(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield index_1.stateManagementService.setStateTable(tableId, machine_1.machine.initialState);
        });
    }
    createUserState(tableId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield index_1.stateManagementService.setStateUser(tableId, userId, machine_1.userMachine.initialState);
        });
    }
    getInterpreter() {
        return (0, xstate_1.interpret)(machine_1.machine);
    }
    getInterpreterUser(timestamp) {
        const currentMachine = machine_1.userMachine;
        currentMachine.withContext({
            lastEventTimestamp: timestamp,
        });
        return (0, xstate_1.interpret)(currentMachine);
    }
    isEligible(tableId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield index_1.stateManagementService.getStateTable(tableId);
            if (!state)
                throw new Error(`State not set for tableid ${tableId}`);
            const stateMachine = xstate_1.State.create(state);
            const response = {
                isEligible: false,
                state: stateMachine.value,
            };
            if (stateMachine.tags && stateMachine.tags.has(event))
                response.isEligible = true;
            return response;
        });
    }
    isEligibleUser(tableId, userId, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield index_1.stateManagementService.getStateUser(tableId, userId);
            if (!state)
                throw new Error(`State not set for tableid ${tableId}`);
            const stateMachine = xstate_1.State.create(state);
            if (!(stateMachine === null || stateMachine === void 0 ? void 0 : stateMachine.context)) {
                throw new Error(`State context not set for tableid ${tableId}|${userId}`);
            }
            const response = {
                isEligible: false,
                state: stateMachine.value,
                timestamp: stateMachine.context.lastEventTimestamp,
            };
            if (stateMachine &&
                stateMachine.context.lastEventTimestamp < timestamp)
                response.isEligible = true;
            return response;
        });
    }
    fireEvent(tableId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield index_1.stateManagementService.getStateTable(tableId);
            if (!state)
                throw new Error(`State not set for tableid ${tableId}`);
            const interpreter = this.getInterpreter();
            interpreter.start(xstate_1.State.create(state));
            interpreter.onTransition((state) => __awaiter(this, void 0, void 0, function* () {
                yield index_1.stateManagementService.setStateTable(tableId, state);
            }));
            interpreter.send({ type: event });
            interpreter.stop();
        });
    }
    fireEventUser(tableId, userId, event, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield index_1.stateManagementService.getStateUser(tableId, userId);
            if (!state)
                throw new Error(`State not set for tableid ${tableId}|${userId}`);
            const interpreter = this.getInterpreterUser(timestamp);
            interpreter.start(xstate_1.State.create(state));
            interpreter.onTransition((state) => __awaiter(this, void 0, void 0, function* () {
                yield index_1.stateManagementService.setStateUser(tableId, userId, state);
            }));
            interpreter.send({ type: event });
            interpreter.stop();
        });
    }
    getCurrentState(tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield index_1.stateManagementService.getStateTable(tableId);
            const machine = xstate_1.State.create(state);
            return machine ? machine.value : 'none';
        });
    }
}
exports.eventStateManager = new EventManager();
