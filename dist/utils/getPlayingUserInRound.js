"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayingUserInRound = void 0;
const constants_1 = require("../constants");
function getPlayingUserInRound(players, play) {
    return players.filter((player) => player.userStatus !== constants_1.PLAYER_STATE.LEFT &&
        (!play || player.userStatus === constants_1.PLAYER_STATE.PLAYING));
}
exports.getPlayingUserInRound = getPlayingUserInRound;
