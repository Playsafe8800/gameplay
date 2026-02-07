"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMachine = exports.machine = void 0;
const events_1 = require("../constants/events");
const xstate_1 = require("xstate");
const constants_1 = require("../constants");
exports.machine = (0, xstate_1.createMachine)({
    id: constants_1.DEPLOYMENT_CONSTANTS.SERVICE_NAME,
    initial: events_1.STATES.WAITING_FOR_PLAYERS,
    context: {
        currentPlayers: 1,
    },
    states: {
        [events_1.STATES.WAITING_FOR_PLAYERS]: {
            on: {
                [events_1.STATE_EVENTS.ADD_PLAYERS]: {
                    actions: 'addPlayer',
                },
                [events_1.STATE_EVENTS.REMOVE_PLAYERS]: {
                    actions: 'removePlayer',
                },
                [events_1.STATE_EVENTS.START_ROUND_TIMER]: {
                    target: events_1.STATES.ROUND_TIMER_STARTED,
                },
            },
            tags: [events_1.EVENTS.LEAVE_TABLE],
        },
        [events_1.STATES.ROUND_TIMER_STARTED]: {
            on: {
                [events_1.STATE_EVENTS.SNAPSHOT_TIMER]: {
                    target: events_1.STATES.LOCK_IN_PERIOD,
                },
            },
            tags: [events_1.EVENTS.LEAVE_TABLE],
        },
        [events_1.STATES.LOCK_IN_PERIOD]: {
            on: {
                [events_1.STATE_EVENTS.LOCK_IN_PERIOD_TIMER]: {
                    target: events_1.STATES.ROUND_STARTED,
                },
            },
        },
        [events_1.STATES.ROUND_STARTED]: {
            on: {
                [events_1.STATE_EVENTS.TURN_STARTED]: {
                    target: events_1.STATES.TURN_STARTED,
                },
            },
            tags: [events_1.EVENTS.LEAVE_TABLE],
        },
        [events_1.STATES.TURN_STARTED]: {
            on: {
                [events_1.STATE_EVENTS.CARD_PICKED]: {
                    target: events_1.STATES.PICKED,
                },
                [events_1.STATE_EVENTS.ROUND_WINNER]: {
                    target: events_1.STATES.ROUND_WINNER_DECLARED,
                },
                [events_1.STATE_EVENTS.GAME_WINNER]: {
                    target: [events_1.STATES.WINNER_DECLARED],
                },
            },
            tags: [
                events_1.EVENTS.PICK_FROM_OPEN_DECK_SOCKET_EVENT,
                events_1.EVENTS.PICK_FROM_CLOSE_DECK_SOCKET_EVENT,
                events_1.EVENTS.DROP_SOCKET_EVENT,
                events_1.EVENTS.LEAVE_TABLE,
                events_1.EVENTS.DISCARDED_CARDS,
            ],
        },
        [events_1.STATES.PICKED]: {
            on: {
                [events_1.STATE_EVENTS.CARD_THROW]: {
                    target: events_1.STATES.THROW,
                },
                [events_1.STATE_EVENTS.DECLARE]: {
                    target: events_1.STATES.DECLARE,
                },
                [events_1.STATE_EVENTS.TURN_STARTED]: {
                    target: events_1.STATES.TURN_STARTED,
                },
                [events_1.STATE_EVENTS.GAME_WINNER]: {
                    target: [events_1.STATES.WINNER_DECLARED],
                },
            },
            tags: [
                events_1.EVENTS.DISCARD_CARD_SOCKET_EVENT,
                events_1.EVENTS.DISCARDED_CARDS,
                events_1.EVENTS.DECLARE_CARD,
                events_1.EVENTS.LEAVE_TABLE,
            ],
        },
        [events_1.STATES.THROW]: {
            on: {
                [events_1.STATE_EVENTS.TURN_STARTED]: {
                    target: events_1.STATES.TURN_STARTED,
                },
            },
            tags: [events_1.EVENTS.LEAVE_TABLE],
        },
        [events_1.STATES.DECLARE]: {
            on: {
                [events_1.STATE_EVENTS.VALID_FINISH]: {
                    target: [events_1.STATES.VALID_FINISH],
                },
                [events_1.STATE_EVENTS.INVALID_FINISH]: {
                    target: [events_1.STATES.INVALID_FINISH],
                },
                [events_1.STATE_EVENTS.GAME_WINNER]: {
                    target: [events_1.STATES.WINNER_DECLARED],
                },
            },
            tags: [events_1.EVENTS.FINISH_ROUND, events_1.EVENTS.LEAVE_TABLE],
        },
        [events_1.STATES.VALID_FINISH]: {
            on: {
                [events_1.STATE_EVENTS.ROUND_WINNER]: {
                    target: events_1.STATES.ROUND_WINNER_DECLARED,
                },
                [events_1.STATE_EVENTS.GAME_WINNER]: {
                    target: events_1.STATES.WINNER_DECLARED,
                },
            },
            tags: [events_1.EVENTS.FINISH_ROUND],
        },
        [events_1.STATES.INVALID_FINISH]: {
            on: {
                [events_1.STATE_EVENTS.ROUND_WINNER]: {
                    target: events_1.STATES.ROUND_WINNER_DECLARED,
                },
                [events_1.STATE_EVENTS.GAME_WINNER]: {
                    target: events_1.STATES.WINNER_DECLARED,
                },
                [events_1.STATE_EVENTS.TURN_STARTED]: {
                    target: events_1.STATES.TURN_STARTED,
                },
            },
        },
        [events_1.STATES.ROUND_WINNER_DECLARED]: {
            on: {
                [events_1.STATE_EVENTS.TURN_STARTED]: {
                    target: events_1.STATES.TURN_STARTED,
                },
                [events_1.STATE_EVENTS.PLAY_MORE]: {
                    target: events_1.STATES.PLAY_MORE,
                },
            },
            tags: [
                events_1.EVENTS.OPEN_REBUY_POPUP,
                events_1.EVENTS.REBUY_ACTION,
                events_1.EVENTS.OPEN_SPLIT_POPUP,
                events_1.EVENTS.SPLIT_ACCEPT_REJECT,
            ],
        },
        [events_1.STATES.WINNER_DECLARED]: {
            on: {
                [events_1.STATE_EVENTS.PLAY_MORE]: {
                    target: events_1.STATES.PLAY_MORE,
                },
            },
            tags: [
                events_1.EVENTS.OPEN_REBUY_POPUP,
                events_1.EVENTS.REBUY_ACTION,
                events_1.EVENTS.OPEN_SPLIT_POPUP,
                events_1.EVENTS.SPLIT_ACCEPT_REJECT,
            ],
        },
        [events_1.STATES.PLAY_MORE]: {
            type: 'final',
            tags: [events_1.EVENTS.LEAVE_TABLE],
        },
    },
    predictableActionArguments: true
}, {
    actions: {
        addPlayer: (0, xstate_1.assign)({
            currentPlayers: (context) => context.currentPlayers + 1,
        }),
        removePlayer: (0, xstate_1.assign)({
            currentPlayers: (context) => context.currentPlayers - 1,
        }),
    }
});
exports.userMachine = (0, xstate_1.createMachine)({
    id: `${constants_1.DEPLOYMENT_CONSTANTS.SERVICE_NAME}:USER`,
    context: {
        lastEventTimestamp: ``,
    },
    initial: events_1.USER_STATES.PLAYING,
    states: {
        [events_1.USER_STATES.PLAYING]: {
            on: {
                [events_1.USER_EVENTS.DECLARE]: {
                    target: events_1.USER_STATES.DECLARED,
                },
                [events_1.USER_EVENTS.DROP]: {
                    target: events_1.USER_STATES.DROPPED,
                },
                [events_1.USER_EVENTS.LEFT]: {
                    target: events_1.USER_STATES.LEFT,
                },
            },
        },
        [events_1.USER_STATES.DECLARED]: {
            on: {
                [events_1.USER_EVENTS.FINISH]: {
                    target: events_1.USER_STATES.FINISH,
                },
            },
        },
        [events_1.USER_STATES.FINISH]: {
            on: {
                [events_1.USER_EVENTS.LEFT]: {
                    target: events_1.USER_STATES.LEFT,
                },
                [events_1.USER_EVENTS.PLAYING]: {
                    target: events_1.USER_STATES.PLAYING,
                },
            },
        },
        [events_1.USER_STATES.DROPPED]: {
            on: {
                [events_1.USER_EVENTS.LEFT]: {
                    target: events_1.USER_STATES.LEFT,
                },
                [events_1.USER_EVENTS.PLAYING]: {
                    target: events_1.USER_STATES.PLAYING,
                },
            },
        },
        [events_1.USER_STATES.LEFT]: {
            type: 'final',
        },
    },
    predictableActionArguments: true,
});
