'use strict';
/* eslint-disable */
const { io } = require('socket.io-client');
const events = require('../dist/constants/events');
const events_payload = require('../tests/events_payload');
const SIGN_UP_PAYLOAD = '../tests/payloads/sign_up.json';
const PICK_FROM_CLOSED_DECK_PAYLOAD =
  '../tests/payloads/pick_from_closed_deck_payload.json';
const GET_GAME_INFO_PAYLOAD =
  '../tests/payloads/get_game_information.json';
const SAVE_CARD_INFO_PAYLOAD =
  '../tests/payloads/save_cards_payload.json';
const GROUP_CARD_INFO_PAYLOAD = '../tests/payloads/group_cards.json';
const OPEN_GAME_POPUP_PAYLOAD =
  '../tests/payloads/player_open_game_popup_payload.json';
const DISCARD_CARD_PAYLOAD =
  '../tests/payloads/player_discard_card_payload.json';
const LEAVE_TABLE_PAYLOAD =
  '../tests/payloads/player_leave_table_payload.json';
const ROUND_SCORE_CARD_PAYLOAD =
  '../tests/payloads/round_score_card_payload.json';
const DECLARE_CARD_PAYLOAD =
  '../tests/payloads/player_declare_payload.json';
const FINISH_ROUND_PAYLOAD =
  '../tests/payloads/finish_round_payload.json';
const constants = require('./../constants');
const chai = require('chai');
const { assert, expect, AssertionError } = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { Logger } = require('winston');
const FileUtils = require('test-jarvis-node').FileUtils;
chai.use(chaiAsPromised);

let options = {
  transports: ['websocket'],
  'force new connection': true,
  timeout: 120000,
  upgrade: true,
  'reconnection limit': 3000,
  reconnect: true,
  'reconnection delay': 3000,
  'max reconnection attempts': 50,
  rememberUpgrade: true,
  autoConnect: true,
  randomizationFactor: 0.5,
  origins: '*',
};

class SocketIoClient {
  constructor(connectionString, players, token, eventObject) {
    options['auth'] = {
      token: token || 'auth-card-game-server-v2-test',
    };
    // Establish socket connection to the node server:
    this.socket = this.socket = io.connect(connectionString, options);
    this.eventObject = eventObject || {};
    this.eventObject.onConnected =
      eventObject.onConnected || function () {};
    this.eventObject.onError = eventObject.onError || function () {};
    let self = this;
    this.cards = [];
    this.user_turn;
    this.is_round_timer_started;
    this.card_responses;
    this.getPickFromClosedDeckCards;
    this.currentPlayer = '';
    this.currentRound;
    this.drop_event_response;
    this.players = players;
    this.groupCardsResponse;
    this.setCardsResponse;
    this.set_emoji_responses;
    this.play_more_yes_or_no;
    this.round_score_card_resp;
    this.round_score_board_resp;
    this.finish_timer_resp;
    this.finish_round_resp;
    this.open_game_popup_resp;
    this.drop_socket_event_resp;
    this.get_game_info_resp;
    this.current_table_id;
    this.winner_declare_resp;
    this.socket.on('connect', function () {
      eventObject.onConnected();
    });
    this.socket.on('error', function (incomingError) {
      eventObject.onError(incomingError);
    });

    this.socket.on('disconnect', function () {
      eventObject.onDisconnect();
    });

    this.socket.on(
      events.EVENTS.COLLECT_BOOT_VALUE_SOCKET_EVENT,
      async (responses) => {
        self.boot_value = await responses;
        return new Promise(function (resolve) {
          resolve(self.boot_value);
        });
      },
    );
    this.socket.on(
      events.EVENTS.SET_MY_CARDS,
      async (save_cards_response) => {
        self.cards = JSON.parse(
          (await save_cards_response).data,
        ).data.cards;
        self.setCardsResponse = JSON.parse(await save_cards_response);
        return new Promise(function (resolve, reject) {
          try {
            resolve(self.setCardsResponse);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    this.socket.on(
      events.EVENTS.OPEN_GAME_POPUP_SOCKET_EVENT,
      async (responses) => {
        return new Promise(function (resolve) {
          resolve(responses);
        });
      },
    );
    this.socket.on(events.EVENTS.SIGN_UP, async (responses) => {
      self.sign_up_response = await responses;
      return new Promise(function (resolve) {
        resolve(self.sign_up_response);
      });
    });
    this.socket.on(
      events.EVENTS.ROUND_TIMER_STARTED,
      async (responses) => {
        self.currentRound = JSON.parse(
          await responses.data,
        ).data.currentRound;
        self.is_round_timer_started = true;
        return new Promise(function (resolve) {
          resolve(self.currentRound);
        });
      },
    );
    this.socket.on(
      events.EVENTS.FIRST_USER_TURN_START,
      async (responses) => {
        try {
          self.user_turn = JSON.parse(
            await responses.data,
          ).data.userId;
          self.user_turn = JSON.parse(
            await responses.data,
          ).data.userId;
        } catch (error) {
          Logger.error(error);
        }
      },
    );
    this.socket.on(
      events.EVENTS.USER_TURN_START,
      async (responses) => {
        try {
          self.user_turn = JSON.parse(
            await responses.data,
          ).data.userId;
        } catch (error) {
          Logger.error(error);
        }
      },
    );
    this.socket.on(
      events.EVENTS.PICK_FROM_CLOSE_DECK_SOCKET_EVENT,
      async (responses) => {
        self.getPickFromClosedDeckCards = await responses;
      },
    );
    this.socket.on(events.EVENTS.GAME_INFO, async (responses) => {
      Logger.info('-responses-GAME_INFO', responses);
    });
    this.socket.on(events.EVENTS.FINISH_ROUND, async (responses) => {
      self.finish_round_resp = await responses;
    });
    this.socket.on(events.EVENTS.FINISH_TIMER, async (responses) => {
      self.finish_timer_resp = await responses;
    });
    this.socket.on(
      events.EVENTS.OPEN_GAME_POPUP_SOCKET_EVENT,
      async (responses) => {
        self.open_game_popup_resp = await responses;
      },
    );
    this.socket.on(events.EVENTS.SET_MY_CARDS, async (responses) => {
      self.card_responses = await responses;
      self.currentRound = JSON.parse(
        await responses,
      ).data.roundNumber;
    });
    this.socket.on(
      events.EVENTS.DROP_SOCKET_EVENT,
      async (responses) => {
        self.drop_event_response = await responses;
      },
    );
    this.socket.on(events.EVENTS.GAME_INFO, async (responses) => {
      self.get_game_info_resp = await responses;
    });
    this.socket.on(events.EVENTS.GROUP_CARDS, async (responses) => {
      self.groupCardsResponse = await responses;
    });
    this.socket.on(
      events.EVENTS.WINNER_DECLARE,
      async (responses) => {
        self.winner_declare_resp = await responses;
      },
    );
    this.socket.on(events.EVENTS.PLAY_MORE, async (responses) => {
      self.play_more_yes_or_no = await responses;
    });
    this.socket.on(events.EVENTS.SET_EMOJI, async (responses) => {
      self.set_emoji_responses = await responses;
    });
    this.socket.on(
      events.EVENTS.ROUND_SCORE_CARD_SOCKET_EVENT,
      async (responses) => {
        self.round_score_card_resp = await responses;
      },
    );
    this.socket.on(
      events.EVENTS.ROUND_SCORE_BOARD_SOCKET_EVENT,
      async (responses) => {
        self.round_score_board_resp = await responses;
      },
    );
  }
  getInitialUserCards() {
    return this.setCardsResponse;
  }
  async getCards() {
    return new Promise(async (res, rej) => {
      try {
        if (this.card_responses !== undefined) {
          let currentCards = JSON.parse(
            JSON.parse(JSON.stringify(this.card_responses)).data,
          ).data.cards;
          let tempCurrentRound = JSON.parse(
            JSON.parse(JSON.stringify(this.card_responses)).data,
          ).data.roundNumber;
          if (tempCurrentRound !== this.currentRound) {
            this.currentRound = tempCurrentRound;
          }
          return res(currentCards);
        } else {
          return res();
        }
      } catch (error) {
        return rej(error);
      }
    });
  }
  getUserTurn() {
    return new Promise(async (res, rej) => {
      try {
        return res(this.user_turn);
      } catch (error) {
        return rej(error);
      }
    });
  }
  getCurrentRound() {
    return new Promise(async (res, rej) => {
      try {
        return res(this.currentRound);
      } catch (error) {
        return rej(error);
      }
    });
  }
  get_pick_from_closed_deck() {
    return this.getPickFromClosedDeckCards;
  }
  getBootValue() {
    return this.boot_value;
  }
  disconnect() {
    this.socket.disconnect();
  }
  async postMessage(player_info) {
    let user_payload;
    this.currentPlayer = player_info;
    if (
      (await constants.tableID) !== undefined &&
      (await constants.tableID) !== ''
    ) {
      user_payload = await events_payload.getSignUpPayload(
        SIGN_UP_PAYLOAD,
        player_info,
        await constants.tableID,
      );
    } else {
      user_payload = await events_payload.getSignUpPayload(
        SIGN_UP_PAYLOAD,
        player_info,
      );
    }
    let self = this;
    return new Promise(async (res, rej) => {
      try {
        self.socket.emit(
          events.EVENTS.SIGN_UP,
          await user_payload,
          async (response) => {
            if (
              constants.tableID === undefined ||
              constants.tableID === ''
            ) {
              let table_id = JSON.parse(await response).data
                .gameTableInfoData[0].tableId;
              self.current_table_id = await table_id;
              return res(await table_id);
            } else {
              self.current_table_id = await table_id;
              return res(await table_id);
            }
          },
        );
      } catch (error) {
        Logger.error(error);
        rej(error);
      }
    });
  }

  async fetch_round_timer_started() {
    let self = this;
    if (!self.is_round_timer_started) {
      setTimeout(fetch_round_timer_started, 2000);
    } else {
      return true;
    }
    return false;
  }

  async isRoundTimerStarted() {
    let self = this;
    return new Promise(async (res, rej) => {
      try {
        setTimeout(self.fetch_round_timer_started, 20000);
        if (self.is_round_timer_started) {
          Logger.info('Round Timer Started');
        } else {
          Logger.info('Round Timer Still not started');
        }
        res(self.is_round_timer_started);
      } catch (err) {
        rej(err);
      }
    });
  }

  async getUserTurnIndex() {
    let self = this;
    return new Promise(async (res, rej) => {
      try {
        let userTurn = await self.getUserTurn();
        //Get Current Round Info & Current User Turn Event
        let CURRENT_ROUND = await self.getCurrentRound();
        Logger.info(
          `CURRENT ROUND - ${CURRENT_ROUND} - Current User Turn - [${await userTurn}]`,
        );
        res(await self.getIndex(self.players, await userTurn));
      } catch (err) {
        rej(err);
      }
    });
  }
  async sendMessage(player_info, table_id) {
    this.currentPlayer = player_info;
    let user_payload = await events_payload.getSignUpPayload(
      SIGN_UP_PAYLOAD,
      player_info,
      await table_id,
    );
    try {
      this.socket.emit(
        events.EVENTS.SIGN_UP,
        await user_payload,
        async (response) => {
          return JSON.parse(await response);
        },
      );
    } catch (error) {
      Logger.error(error);
    }
  }
  async pick_from_closed_deck(player_id, isValid, message) {
    let self = this;
    let req_payload = await events_payload.pickFromDeck(
      PICK_FROM_CLOSED_DECK_PAYLOAD,
      player_id,
      await self.current_table_id,
    );
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.PICK_FROM_CLOSE_DECK_SOCKET_EVENT,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              self.getPickFromClosedDeckCards = await response;
              if (!isValid) {
                let result = JSON.parse(await response).success;
                let resultMessage = `Response Verification for [${
                  events.EVENTS.PICK_FROM_CLOSE_DECK_SOCKET_EVENT
                }] - [${player_id}] - Result - Expected - [${isValid}] & Type of [${typeof isValid}] & Actual - [${await result}] & [${typeof (await result)}]`;

                assert.strictEqual(isValid, await result);
                //expect.fail('custom error message');
                //expect(isValid).to.equal(await result);
                let errorMessage = JSON.parse(await response).error
                  .errorMessage;
                let resultErrMessage = `Response Verification for [${
                  events.EVENTS.PICK_FROM_CLOSE_DECK_SOCKET_EVENT
                }] - [${player_id}] - Error Message - Expected - [${message}] & Type of [${typeof message}] & Actual - [${await errorMessage}] & Type Of[${typeof (await errorMessage)}]`;

                expect(message).to.equal(await errorMessage);
              } else {
                let result = JSON.parse(await response).data.card;
                //expect().to.equal(await errorMessage);
                expect(result).to.not.be.null;
              }
              return res(JSON.parse(await response).data.card);
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }

  async getIndex(testUsers, user) {
    return testUsers.findIndex(
      (userIndex) => userIndex === '' + user,
    );
  }

  async get_game_info(player_id) {
    let req_payload = await events_payload.getGetGameInfo(
      GET_GAME_INFO_PAYLOAD,
      player_id,
      await this.current_table_id,
    );
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.GAME_INFO,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              let result = JSON.parse(await response).success;
              let resultMessage = `Response Verification for [${events.EVENTS.GAME_INFO}] - [${player_id}] - Result`;

              assert.strictEqual(true, await result);
              return res(JSON.parse(await response));
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }
  async group_cards(player_id, cards, isValid, errorMessage) {
    let req_payload = await events_payload.groupCards(
      GROUP_CARD_INFO_PAYLOAD,
      await this.current_table_id,
      player_id,
      cards,
    );
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.GROUP_CARDS,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              return res(JSON.parse(await response));
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }
  async open_game_popup(player_id, action, isValid, errorMessage) {
    let req_payload = await events_payload.openGamePopup(
      OPEN_GAME_POPUP_PAYLOAD,
      player_id,
      await this.current_table_id,
      action,
    );
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.OPEN_GAME_POPUP_SOCKET_EVENT,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              return res(JSON.parse(await response));
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }
  async save_cards(player_id, cards, isValid, errorMessage) {
    let req_payload = JSON.parse((await this.card_responses).data);
    req_payload.data.tableId = this.current_table_id;
    req_payload.metrics.tableId = this.current_table_id;
    req_payload.metrics.userId = player_id;
    req_payload.data.dealer = player_id;
    req_payload.data.cards = cards;
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.SET_MY_CARDS,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              let result = JSON.parse(await response).success;
              let resultTitle = JSON.parse(await response).data.title;
              let resultMessage = `Response Verification for [${events.EVENTS.SET_MY_CARDS}] - [${player_id}] - Result`;

              assert.strictEqual(
                isValid,
                await result,
                '[SAVE_CARDS] Events results should be valid with expected one - Exp - [' +
                  isValid +
                  '] & Actual - [' +
                  (await result) +
                  ']',
              );
              if (!isValid) {
                assert.strictEqual(
                  errorMessage,
                  await resultTitle,
                  '[SAVE_CARDS] Events Error Message - Exp - [' +
                    errorMessage +
                    '] & Actual - [' +
                    (await resultTitle) +
                    ']',
                );
              }
              return res(JSON.parse(await response));
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }
  async discard_cards(player_id, existing_cards, card, isValid) {
    let req_payload = await events_payload.discardCard(
      DISCARD_CARD_PAYLOAD,
      player_id,
      await this.current_table_id,
      existing_cards,
      card,
    );
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.DISCARD_CARD_SOCKET_EVENT,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              let result = JSON.parse(await response).data.score;
              let resultMessage = `Response Verification for [${events.EVENTS.DISCARD_CARD_SOCKET_EVENT}] - [${player_id}] - Result`;
              expect(result).to.not.be.null;
              //assert.strictEqual(isValid, await result, resultMessage + ' [DISCARD_CARDS] Event - Exp - [' + isValid + '] & Actual - [' + (await result) + ']');
              return res(JSON.parse(await response));
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }
  async leave_table(player_id, isValid) {
    let req_payload = await events_payload.leaveTable(
      LEAVE_TABLE_PAYLOAD,
      player_id,
      await this.current_table_id,
    );
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.LEAVE_TABLE,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              let result = JSON.parse(await response).success;
              let resultMessage = `Response Verification for [${events.EVENTS.LEAVE_TABLE}] - [${player_id}] - Result`;
              //assert.strictEqual(isValid, await result, resultMessage + ' [LEAVE_TABLE] Event - Exp - [' + isValid + '] & Actual - [' + (await result) + ']');
              return res(JSON.parse(await response));
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }
  async round_score_card(player_id) {
    let req_payload = await events_payload.roundScoreCard(
      ROUND_SCORE_CARD_PAYLOAD,
      await this.current_table_id,
      player_id,
    );
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.ROUND_SCORE_CARD_SOCKET_EVENT,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              // let result = JSON.parse(await response).success;
              // let resultMessage = `Response Verification for [${events.EVENTS.ROUND_SCORE_CARD_SOCKET_EVENT}] - [${player_id}] - Result`;
              //assert.strictEqual(isValid, await result, resultMessage + ' [ROUND_SCORE_CARD_SOCKET_EVENT] Event - Exp - [' + isValid + '] & Actual - [' + (await result) + ']');
              return res(JSON.parse(await response));
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }
  async drop_game(player_id, card, group_cards, isValid, message) {
    let req_payload = await events_payload.declareGame(
      DECLARE_CARD_PAYLOAD,
      player_id,
      await this.current_table_id,
      card,
      group_cards,
    );
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.DECLARE_CARD,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              let result = JSON.parse(await response).success;
              let resultData = JSON.parse(await response).data;
              let resultMessage = `Response Verification for [${events.EVENTS.DECLARE_CARD}] - [${player_id}] - Result`;
              if (result !== undefined) {
                assert.strictEqual(
                  isValid,
                  await result,
                  resultMessage,
                );
              } else {
                assert.isNotNull(
                  resultData,
                  'Declare Cards Data Should be available in the response',
                );
              }
              if (!isValid) {
                let resultErrorMessage = JSON.parse(await response)
                  .error.errorMessage;
                assert.strictEqual(
                  message,
                  await resultErrorMessage,
                  resultMessage,
                );
              }
              return res(JSON.parse(await response));
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }
  async declare_cards(
    player_id,
    table_id,
    card,
    group_cards,
    isValid,
    message,
  ) {
    if (this.current_table_id === undefined) {
      this.current_table_id = await table_id;
    }
    let req_payload = await events_payload.declareGame(
      DECLARE_CARD_PAYLOAD,
      player_id,
      await this.current_table_id,
      card,
      group_cards,
    );
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.DECLARE_CARD,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              let result = JSON.parse(await response).success;
              let resultData = JSON.parse(await response).data;
              let resultMessage = `Response Verification for [${events.EVENTS.DECLARE_CARD}] - [${player_id}] - Result`;
              if (result !== undefined) {
                assert.strictEqual(
                  isValid,
                  await result,
                  resultMessage,
                );
              } else {
                assert.isNotNull(
                  resultData,
                  'Declare Cards Data Should be available in the response',
                );
              }
              if (!isValid) {
                let resultErrorMessage = JSON.parse(await response)
                  .error.errorMessage;
                assert.strictEqual(
                  message,
                  await resultErrorMessage,
                  resultMessage,
                );
              }
              return res(JSON.parse(await response));
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }
  async finish_round(player_id, group_cards, isValid, message) {
    let req_payload = await events_payload.finishRound(
      FINISH_ROUND_PAYLOAD,
      player_id,
      await this.current_table_id,
      group_cards,
    );
    return new Promise(async (res, rej) => {
      this.socket.emit(
        events.EVENTS.FINISH_ROUND,
        await req_payload,
        async (response) => {
          if (await response) {
            try {
              let result = JSON.parse(await response).success;
              let resultData = JSON.parse(await response).success;
              let resultMessage = `Response Verification for [${events.EVENTS.FINISH_ROUND}] - [${player_id}] - Result`;
              if (result !== undefined) {
                assert.strictEqual(
                  isValid,
                  await result,
                  resultMessage,
                );
              } else {
                assert.isNotNull(
                  resultData,
                  'Finish Round Data Should be available in the response',
                );
              }
              if (!isValid) {
                let resultErrorMessage = JSON.parse(await response)
                  .error.errorMessage;
                assert.strictEqual(
                  message,
                  await resultErrorMessage,
                  resultMessage,
                );
              }
              return res(JSON.parse(await response));
            } catch (error) {
              return rej(error);
            }
          }
        },
      );
    });
  }
  async eventEmitter(player_info, table_id) {
    let user_payload = await events_payload.getSignUpPayload(
      SIGN_UP_PAYLOAD,
      player_info,
      await table_id,
    );
    try {
      this.socket.emit(
        events.EVENTS.SIGN_UP,
        await user_payload,
        async (response) => {
          return JSON.parse(await response);
        },
      );
    } catch (error) {
      Logger.error(error);
    }
  }
  on() {
    this.socket.on.apply(this.socket, arguments);
  }
  async first_sign_up(player) {
    let self = this;
    try {
      return await self.postMessage(player);
    } catch (error) {
      Logger.error(error);
    }
  }
  async sign_up(player) {
    try {
      return await this.postMessage(player);
    } catch (error) {
      Logger.error(error);
    }
  }
  async sign_up(player, table_id) {
    try {
      await FileUtils.delay(2000);

      if ((await table_id) !== undefined) {
        this.current_table_id = await table_id;
      } else {
        this.current_table_id = await table_id;
      }

      this.currentPlayer = player;
      await this.sendMessage(player, this.current_table_id);
    } catch (error) {
      Logger.error(error);
    }
  }
  async duplicate_sign_up(player, table_id, isValid) {
    await this.eventEmitter(player, await table_id);
    if (signUpResponse) {
      let result = await signUpResponse.success;
    }
  }
  sign_up_all_players(clients, users) {
    clients.forEach((client, index) => {
      if (index === 0) {
        return new Promise((resolve) => {
          resolve();
        });
      } else {
        return new Promise((resolve, reject) => {
          try {
            resolve(true);
          } catch (er) {
            reject(er);
          }
        });
      }
    });
  }
}

module.exports = {
  SocketIoClient: SocketIoClient,
};
