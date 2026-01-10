import {
  EVENTS,
  STATES,
  STATE_EVENTS,
  USER_STATES,
  USER_EVENTS,
} from '../constants/events';
import { createMachine, assign } from 'xstate';
import { DEPLOYMENT_CONSTANTS } from '../constants';

export const machine = createMachine(
  {
    id: DEPLOYMENT_CONSTANTS.SERVICE_NAME,
    initial: STATES.WAITING_FOR_PLAYERS,
    context: {
      currentPlayers: 1,
    },
    states: {
      [STATES.WAITING_FOR_PLAYERS]: {
        on: {
          [STATE_EVENTS.ADD_PLAYERS]: {
            actions: 'addPlayer',
          },
          [STATE_EVENTS.REMOVE_PLAYERS]: {
            actions: 'removePlayer',
          },
          [STATE_EVENTS.START_ROUND_TIMER]: {
            target: STATES.ROUND_TIMER_STARTED,
          },
        },
        tags: [EVENTS.LEAVE_TABLE],
      },
      [STATES.ROUND_TIMER_STARTED]: {
        on: {
          [STATE_EVENTS.SNAPSHOT_TIMER]: {
            target: STATES.LOCK_IN_PERIOD,
          },
        },
        tags: [EVENTS.LEAVE_TABLE],
      },
      [STATES.LOCK_IN_PERIOD]: {
        on: {
          [STATE_EVENTS.LOCK_IN_PERIOD_TIMER]: {
            target: STATES.ROUND_STARTED,
          },
        },
      },
      [STATES.ROUND_STARTED]: {
        on: {
          [STATE_EVENTS.TURN_STARTED]: {
            target: STATES.TURN_STARTED,
          },
        },
        tags: [EVENTS.LEAVE_TABLE],
      },
      [STATES.TURN_STARTED]: {
        on: {
          [STATE_EVENTS.CARD_PICKED]: {
            target: STATES.PICKED,
          },
          [STATE_EVENTS.ROUND_WINNER]: {
            target: STATES.ROUND_WINNER_DECLARED,
          },
          [STATE_EVENTS.GAME_WINNER]: {
            target: [STATES.WINNER_DECLARED],
          },
        },
        tags: [
          EVENTS.PICK_FROM_OPEN_DECK_SOCKET_EVENT,
          EVENTS.PICK_FROM_CLOSE_DECK_SOCKET_EVENT,
          EVENTS.DROP_SOCKET_EVENT,
          EVENTS.LEAVE_TABLE,
          EVENTS.DISCARDED_CARDS,
        ],
      },
      [STATES.PICKED]: {
        on: {
          [STATE_EVENTS.CARD_THROW]: {
            target: STATES.THROW,
          },
          [STATE_EVENTS.DECLARE]: {
            target: STATES.DECLARE,
          },
          [STATE_EVENTS.TURN_STARTED]: {
            target: STATES.TURN_STARTED,
          },
          [STATE_EVENTS.GAME_WINNER]: {
            target: [STATES.WINNER_DECLARED],
          },
        },
        tags: [
          EVENTS.DISCARD_CARD_SOCKET_EVENT,
          EVENTS.DISCARDED_CARDS,
          EVENTS.DECLARE_CARD,
          EVENTS.LEAVE_TABLE,
        ],
      },
      [STATES.THROW]: {
        on: {
          [STATE_EVENTS.TURN_STARTED]: {
            target: STATES.TURN_STARTED,
          },
        },
        tags: [EVENTS.LEAVE_TABLE],
      },
      [STATES.DECLARE]: {
        on: {
          [STATE_EVENTS.VALID_FINISH]: {
            target: [STATES.VALID_FINISH],
          },
          [STATE_EVENTS.INVALID_FINISH]: {
            target: [STATES.INVALID_FINISH],
          },
          [STATE_EVENTS.GAME_WINNER]: {
            target: [STATES.WINNER_DECLARED],
          },
        },
        tags: [EVENTS.FINISH_ROUND, EVENTS.LEAVE_TABLE],
      },
      [STATES.VALID_FINISH]: {
        on: {
          [STATE_EVENTS.ROUND_WINNER]: {
            target: STATES.ROUND_WINNER_DECLARED,
          },
          [STATE_EVENTS.GAME_WINNER]: {
            target: STATES.WINNER_DECLARED,
          },
        },
        tags: [EVENTS.FINISH_ROUND],
      },
      [STATES.INVALID_FINISH]: {
        on: {
          [STATE_EVENTS.ROUND_WINNER]: {
            target: STATES.ROUND_WINNER_DECLARED,
          },
          [STATE_EVENTS.GAME_WINNER]: {
            target: STATES.WINNER_DECLARED,
          },
          [STATE_EVENTS.TURN_STARTED]: {
            target: STATES.TURN_STARTED,
          },
        },
      },
      [STATES.ROUND_WINNER_DECLARED]: {
        on: {
          [STATE_EVENTS.TURN_STARTED]: {
            target: STATES.TURN_STARTED,
          },
          [STATE_EVENTS.PLAY_MORE]: {
            target: STATES.PLAY_MORE,
          },
        },
        tags: [
          EVENTS.OPEN_REBUY_POPUP,
          EVENTS.REBUY_ACTION,
          EVENTS.OPEN_SPLIT_POPUP,
          EVENTS.SPLIT_ACCEPT_REJECT,
        ],
      },
      [STATES.WINNER_DECLARED]: {
        on: {
          [STATE_EVENTS.PLAY_MORE]: {
            target: STATES.PLAY_MORE,
          },
        },
        tags: [
          EVENTS.OPEN_REBUY_POPUP,
          EVENTS.REBUY_ACTION,
          EVENTS.OPEN_SPLIT_POPUP,
          EVENTS.SPLIT_ACCEPT_REJECT,
        ],
      },
      [STATES.PLAY_MORE]: {
        type: 'final',
        tags: [EVENTS.LEAVE_TABLE],
      },
    },
    predictableActionArguments: true
  },
  {
    actions: {
      addPlayer: assign({
        currentPlayers: (context) => context.currentPlayers + 1,
      }),
      removePlayer: assign({
        currentPlayers: (context) => context.currentPlayers - 1,
      }),
    }
  },
);

export const userMachine = createMachine({
  id: `${DEPLOYMENT_CONSTANTS.SERVICE_NAME}:USER`,
  context: {
    lastEventTimestamp: ``,
  },
  initial: USER_STATES.PLAYING,
  states: {
    [USER_STATES.PLAYING]: {
      on: {
        [USER_EVENTS.DECLARE]: {
          target: USER_STATES.DECLARED,
        },
        [USER_EVENTS.DROP]: {
          target: USER_STATES.DROPPED,
        },
        [USER_EVENTS.LEFT]: {
          target: USER_STATES.LEFT,
        },
      },
    },
    [USER_STATES.DECLARED]: {
      on: {
        [USER_EVENTS.FINISH]: {
          target: USER_STATES.FINISH,
        },
      },
    },
    [USER_STATES.FINISH]: {
      on: {
        [USER_EVENTS.LEFT]: {
          target: USER_STATES.LEFT,
        },
        [USER_EVENTS.PLAYING]: {
          target: USER_STATES.PLAYING,
        },
      },
    },
    [USER_STATES.DROPPED]: {
      on: {
        [USER_EVENTS.LEFT]: {
          target: USER_STATES.LEFT,
        },
        [USER_EVENTS.PLAYING]: {
          target: USER_STATES.PLAYING,
        },
      },
    },
    [USER_STATES.LEFT]: {
      type: 'final',
    },
  },
  predictableActionArguments: true,
});
