import { stateManagementService } from '../db/state/index';
import { interpret, State } from 'xstate';
import { machine, userMachine } from './machine';

class EventManager {
  async createState(tableId) {
    await stateManagementService.setStateTable(
      tableId,
      machine.initialState,
    );
  }

  async createUserState(tableId: string, userId: number) {
    await stateManagementService.setStateUser(
      tableId,
      userId,
      userMachine.initialState,
    );
  }

  getInterpreter() {
    return interpret(machine);
  }

  getInterpreterUser(timestamp: string) {
    const currentMachine = userMachine;
    currentMachine.withContext({
      lastEventTimestamp: timestamp,
    });
    return interpret(currentMachine);
  }

  async isEligible(tableId, event) {
    const state = await stateManagementService.getStateTable(tableId);
    if (!state)
      throw new Error(`State not set for tableid ${tableId}`);
    const stateMachine = State.create(state);
    const response = {
      isEligible: false,
      state: stateMachine.value,
    };
    if (stateMachine.tags && stateMachine.tags.has(event))
      response.isEligible = true;
    return response;
  }

  async isEligibleUser(
    tableId: string,
    userId: number,
    timestamp: string,
  ) {
    const state = await stateManagementService.getStateUser(
      tableId,
      userId,
    );
    if (!state)
      throw new Error(`State not set for tableid ${tableId}`);
    const stateMachine: any = State.create(state);
    if (!stateMachine?.context) {
      throw new Error(
        `State context not set for tableid ${tableId}|${userId}`,
      );
    }
    const response = {
      isEligible: false,
      state: stateMachine.value,
      timestamp: stateMachine.context.lastEventTimestamp,
    };
    if (
      stateMachine &&
      stateMachine.context.lastEventTimestamp < timestamp
    )
      response.isEligible = true;
    return response;
  }

  async fireEvent(tableId, event) {
    const state = await stateManagementService.getStateTable(tableId);
    if (!state)
      throw new Error(`State not set for tableid ${tableId}`);
    const interpreter = this.getInterpreter();
    interpreter.start(State.create(state));
    interpreter.onTransition(async (state) => {
      await stateManagementService.setStateTable(tableId, state);
    });
    interpreter.send({ type: event });
    interpreter.stop();
  }

  async fireEventUser(
    tableId: string,
    userId: number,
    event: string,
    timestamp: string,
  ) {
    const state = await stateManagementService.getStateUser(
      tableId,
      userId,
    );
    if (!state)
      throw new Error(
        `State not set for tableid ${tableId}|${userId}`,
      );
    const interpreter = this.getInterpreterUser(timestamp);
    interpreter.start(State.create(state));
    interpreter.onTransition(async (state) => {
      await stateManagementService.setStateUser(
        tableId,
        userId,
        state,
      );
    });
    interpreter.send({ type: event });
    interpreter.stop();
  }

  async getCurrentState(tableId) {
    const state = await stateManagementService.getStateTable(tableId);
    const machine = State.create(state);
    return machine ? machine.value : 'none';
  }
}

export const eventStateManager = new EventManager();
