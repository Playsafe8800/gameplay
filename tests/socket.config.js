/* eslint-disable */
'use strict';

let port = process.env.PORT || process.env.port || 5800;
const url = 'http://127.0.0.1:' + port;

const options = {
  path: '',
  'force new connection': true,
  transports: ['polling', 'websocket'],
  transportOptions: {
    polling: {
      extraHeaders: {},
    },
  },
  autoConnect: false,
  rejectUnauthorized: false,
  timeout: 300000,
  pingInterval: 30000,
  pingTimeout: 60000,
  reconnection: false,
  reconnectionAttempts: 3,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  origins: '*',
  auth: {
    token: 'auth-card-game-server-v2-test',
  },
};

const options_player_2 = {
  transports: ['polling', 'websocket'],
  transportOptions: {
    polling: {
      extraHeaders: {},
    },
  },
  rejectUnauthorized: false,
  timeout: 300000,
  pingInterval: 30000,
  pingTimeout: 60000,
  reconnection: false,
  reconnectionAttempts: 3,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  origins: '*',
  auth: {
    token: 'auth-card-game-server-v3-test',
  },
};

module.exports = {
  player1: options,
  player2: options_player_2,
  url: url,
};
