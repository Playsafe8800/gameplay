"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MMTYPE = exports.MMSERVICE = exports.INSTRUMENTATION_EVENT_REASONS = exports.INSTRUMENTATION_EVENTS = void 0;
exports.INSTRUMENTATION_EVENTS = Object.freeze({
    USER_TABLE_JOINED: 'User Table Joined',
    USER_GAME_REJOINED: 'User Game Rejoined',
    USER_TABLE_EXITED: 'User Table Exited',
    USER_RUMMY_ROUND_STARTED: 'User Rummy Round Started',
    USER_PLAYED_GAME: 'User Played Game',
    USER_MATCH_FOUND: 'User Match Found',
});
exports.INSTRUMENTATION_EVENT_REASONS = Object.freeze({
    JOINED_SUCCESSFULLY: 'Joined successfully',
    REJOINED_SUCCESSFULLY: 'Rejoined successfully',
    GAME_ENDED_BEFORE_REJOIN: 'Game ended before Rejoin',
    USER_TABLE_EXITED: 'User Table Exited',
});
exports.MMSERVICE = Object.freeze({
    CGS: 'CGS',
});
exports.MMTYPE = Object.freeze({
    ELO: 'ELO',
    FIFO: 'FIFO',
});
