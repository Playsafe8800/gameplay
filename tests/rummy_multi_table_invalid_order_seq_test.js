/* eslint-disable */
/**
 * Modify the parts you need to get it working.
 */
var io = require('socket.io-client');
const winstonLogger = require('test-jarvis-node').logger;
const constants = require('../constants');
const FileUtils = require('test-jarvis-node').FileUtils;
const addContext = require('mochawesome/addContext');
const chai = require('chai');
const { assert } = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const SocketIoClient =
  require('../lib/SocketIoClient').SocketIoClient;

const CURRENT_TURN_ERR_MESSAGE = 'current turn is not your turn !';
const ERROR_MESSAGE =
  'The intended request is invalid at this moment';
var serverUrl = 'http://localhost:5900';

var numberOfPlayersToConnect = 2;

async function randomExcludedNumber(excludeNumber) {
  let randNumber = excludeNumber;
  while (randNumber == excludeNumber) {
    randNumber = Math.floor(Math.random() * numberOfPlayersToConnect);
  }
  return randNumber;
}

async function game_play(
  clients,
  testUsers,
  table_id,
  number_of_turns,
  round_number,
  context,
) {
  if (round_number > 1) {
    await FileUtils.delay(3000);
  }
  let firstMoveIndex = await clients[0].getUserTurnIndex();
  let playerCards = await clients[firstMoveIndex].getCards();
  addContext(
    context,
    `[Round ${round_number}][DECLARE_CARD] Events invoked`,
  );
  await clients[await firstMoveIndex].declare_cards(
    testUsers[await firstMoveIndex],
    await table_id,
    await playerCards[0],
    playerCards,
    false,
    ERROR_MESSAGE,
  );

  for (let index = 0; index < number_of_turns; index++) {
    //await FileUtils.delay(3000);
    //First Player Move - Fetch Socket Client by Player Index
    firstMoveIndex = await clients[0].getUserTurnIndex();
    addContext(
      context,
      `[Round ${round_number}]Current Player - User Turn - [${
        testUsers[await firstMoveIndex]
      }]`,
    );
    playerCards = await clients[firstMoveIndex].getCards();
    //Duplicate PICK_FROM_CLOSE_DECK event
    let picked_card_for_first_player = await clients[
      await firstMoveIndex
    ].pick_from_closed_deck(
      testUsers[await firstMoveIndex],
      true,
      '',
    );
    await clients[await firstMoveIndex].pick_from_closed_deck(
      testUsers[await firstMoveIndex],
      false,
      ERROR_MESSAGE,
    );
    await playerCards.push(await picked_card_for_first_player);
    if (index === 0) {
      //Duplicate - GROUP_CARDS events
      let groupCards_Response = await clients[
        await firstMoveIndex
      ].group_cards(
        testUsers[await firstMoveIndex],
        await playerCards,
        true,
        '',
      );
      await clients[await firstMoveIndex].group_cards(
        testUsers[await firstMoveIndex],
        await playerCards,
        true,
        '',
      );
      addContext(
        context,
        `[Round ${round_number}]Player - [${
          testUsers[await firstMoveIndex]
        }] - DISCARD Card - ${await playerCards[5]}`,
      );

      //Duplicate Events - DISCARD_CARDS
      await clients[await firstMoveIndex].discard_cards(
        testUsers[await firstMoveIndex],
        await groupCards_Response.data.group,
        await playerCards[5],
        true,
        '',
      );
      await clients[await firstMoveIndex].discard_cards(
        testUsers[await firstMoveIndex],
        await groupCards_Response.data.group,
        await playerCards[5],
        false,
        ERROR_MESSAGE,
      );
      //await clients[await firstMoveIndex].get_game_info(testUsers[await firstMoveIndex]);
    } else if (index > 0) {
      //Remove one card from existing lists for a player
      let card_removed_position = await playerCards[5];
      let player_2_cards = await removeCardFromPosition(
        await playerCards,
        5,
      );

      addContext(
        context,
        `[Round ${round_number}]PICK_FROM_CLOSE_DECK - Player - [${
          testUsers[await firstMoveIndex]
        }] - PICKS [${await picked_card_for_first_player}] & Removes - [${await playerCards[5]}]`,
      );
      let groupCards_Response = await clients[
        await firstMoveIndex
      ].group_cards(
        testUsers[await firstMoveIndex],
        player_2_cards,
        true,
        '',
      );
      //Duplicate Events - DECLARE_CARDS events
      await clients[await firstMoveIndex].declare_cards(
        testUsers[await firstMoveIndex],
        await table_id,
        await player_2_cards[0],
        await player_2_cards,
        true,
        '',
      );
      //await clients[await firstMoveIndex].declare_cards(await table_id, testUsers[await firstMoveIndex], await player_2_cards[0], await player_2_cards, false, ERROR_MESSAGE);

      addContext(
        context,
        `[Round ${round_number}]Player - [${
          testUsers[await firstMoveIndex]
        }] - Selects [Declare, Open Game Popup & Finish] EVENT for the round`,
      );
      await clients[await firstMoveIndex].open_game_popup(
        testUsers[await firstMoveIndex],
        'declare',
        true,
        '',
      );
      await FileUtils.delay(2000);
      //Duplicate Events - FINISH_ROUND events
      await clients[await firstMoveIndex].finish_round(
        testUsers[await firstMoveIndex],
        player_2_cards,
        true,
        '',
      );
      await clients[await firstMoveIndex].finish_round(
        testUsers[await firstMoveIndex],
        player_2_cards,
        false,
        ERROR_MESSAGE,
      );
      await clients[await firstMoveIndex].get_game_info(
        testUsers[await firstMoveIndex],
      );
      await FileUtils.delay(3000);
    }
  }
  let round_score_card_response = await clients[0].round_score_card(
    testUsers[0],
  );
  addContext(
    context,
    `[Round ${round_number}]Player Winner Score Card - ${JSON.stringify(
      await round_score_card_response,
    )}`,
  );
  //Waiting for 10 seconds before exiting from test execution
  await FileUtils.delay(25000);
}

/**
  To remove a specific card from the array list
*/
async function removeCardFromPosition(
  existing_player_cards,
  position,
) {
  let player_2_cards_remove_one_card = existing_player_cards;
  //For Example : Removing 1 card from the deck at position - 5
  player_2_cards_remove_one_card.splice(position, 1);
  return player_2_cards_remove_one_card;
}

describe('Rummy Multi Table Test Suite', function () {
  var clients = [];
  let testUsers = ['833745', '837769', '837770', '837771', '837772'];
  //let testUsers = ['833745', '837769'];
  let log = winstonLogger.logger;
  const authTokenMap = new Map();
  const clientSocketByUser = new Map();

  this.beforeEach(function (beforeDone) {
    var connectionInterval = 750;
    //var numberOfUsersToConnect = 5;
    var connections = 0;
    var connectionTimestampSum = 0;
    authTokenMap.set('user1', 'auth-card-game-server-v2-test');
    authTokenMap.set('user2', 'auth-card-game-server-v3-test');
    authTokenMap.set('user3', 'auth-card-game-server-v4-test');
    authTokenMap.set('user4', 'auth-card-game-server-v5-test');
    authTokenMap.set('user5', 'auth-card-game-server-v6-test');
    //authTokenMap.set('user6', 'auth-card-game-server-v7-test');

    for (var i = 1; i <= numberOfPlayersToConnect; i++) {
      (function (index) {
        setTimeout(function () {
          var time = Date.now();
          var client = new SocketIoClient(
            serverUrl,
            testUsers,
            authTokenMap.get('user' + index),
            {
              onConnected: function () {
                connections++;
                connectionTimestampSum += Date.now() - time;
                clientSocketByUser.set(
                  testUsers[index - 1],
                  index - 1,
                );
                clients.push(client);
                if (index == numberOfPlayersToConnect) {
                  log.info('All Players connected');
                  beforeDone();
                }
              },
              onDisconnect: function () {},
            },
          );
        }, index * connectionInterval);
      })(i);
    }
  });

  this.afterEach(function () {
    setTimeout(function () {}, 20000);
    addContext(this, {
      title: 'After Test Suite - ' + Date.now(),
      value: { table_id: constants.tableID, players: testUsers },
    });
    setTimeout(function () {
      clients.forEach((client, i) => {
        if (client) {
          client.disconnect();
        }
      });
    }, 30000);
  });

  it('Verify invalid order of events & duplicate events test', async function () {
    try {
      let number_of_players = numberOfPlayersToConnect - 1;
      let table_id = await clients[0].first_sign_up(testUsers[0]);
      constants.tableID = await table_id;
      await FileUtils.delay(3000);
      //SIGN_UP List of users and join inside the same table as first user.
      for (
        let userIndex = 1;
        userIndex <= number_of_players;
        userIndex++
      ) {
        await clients[userIndex].sign_up(
          testUsers[userIndex],
          await table_id,
        );
      }
      //Waits for Game beigns after 20 seconds which sets the cards & user turn to play the game
      await FileUtils.delay(22000); //Waits for the game to be Round timer to be started
      const clientCardsByUser = new Map();
      //Get Cards for all the players and store(s) it in a map
      for (
        let userIndex = 0;
        userIndex < numberOfPlayersToConnect;
        userIndex++
      ) {
        clientCardsByUser.set(
          'user' + (userIndex + 1),
          await clients[userIndex].getCards(),
        );
      }

      let number_of_turns = numberOfPlayersToConnect;
      await game_play(
        clients,
        testUsers,
        await table_id,
        number_of_turns,
        1,
        this,
      );
      let current_round = await clients[0].getCurrentRound();
      await game_play(
        clients,
        testUsers,
        await table_id,
        number_of_turns,
        current_round,
        this,
      );
      current_round = await clients[0].getCurrentRound();
      await game_play(
        clients,
        testUsers,
        await table_id,
        number_of_turns,
        current_round,
        this,
      );
      for (
        let userIndex = 0;
        userIndex < number_of_players;
        userIndex++
      ) {
        await clients[await userIndex].leave_table(
          testUsers[await userIndex],
          true,
        );
      }
      //Waiting for 10 seconds before exiting from test execution
      await FileUtils.delay(3000);
    } catch (error) {
      assert.fail(error);
    }
  });
});
