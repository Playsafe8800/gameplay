"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME_END_REASONS_INSTRUMENTATION = exports.GAME_END_REASONS = void 0;
exports.GAME_END_REASONS = Object.freeze({
    DROP: 'drop',
    INVALID_DECLARE: 'invalidDeclare',
    STANDUP: 'standup',
    SWITCH: 'switch',
    LEFT: 'left',
    LOST: 'lost',
    WON: 'won',
});
exports.GAME_END_REASONS_INSTRUMENTATION = Object.freeze({
    DROP: 'Drop',
    AUTO_DROP_DROP: 'Auto Drop_Drop',
    MIDDLE_DROP: 'Middle Drop',
    AUDO_MIDDLE_DROP: 'Auto Drop_Middle Drop',
    TIMEOUT_DROP: 'Timeout Drop',
    EXIT: 'Exit',
    LOST: 'lost',
    WINNER: 'Winner',
    INVALID_DECLARE: 'Invalid declare',
    ELIMINATED: 'Eliminated',
});
