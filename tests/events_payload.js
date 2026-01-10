/* eslint-disable */
'use strict';
let fs = require('fs');
let path = require('path');
const uuidv4 = require('uuid').v4;
const { Logger } = require('winston');

const DEFAULT_CHARSET = 'utf-8';

/*
 * Read a JSON file and parse it, calling the callback with the resulting object
 * or an error.
 */
async function readFile(readFilePath) {
  try {
    return new Promise((resolve, reject) => {
      fs.readFile(
        path.join(__dirname, readFilePath),
        DEFAULT_CHARSET,
        function (err, data) {
          if (err) {
            reject(err);
          }
          resolve(data);
        },
      );
    });
  } catch (err) {
    Logger.error(err);
  }
}

/*
 * Read a JSON file and parse it.
 */
async function readContent(fileName) {
  let content = await readFile(path.join('./', fileName));
  return JSON.parse(content);
}

/*
 * User Sign-Up Payload and it changes only the user name.
 */
async function getSignUpPayload(filePath, userId) {
  let content = JSON.parse(await readFile(filePath));
  content.userId = userId;
  content.id = uuidv4();
  content.requestId = uuidv4();
  content.metrics.uuid = uuidv4();
  content.metrics.ctst = Date.now();
  content.metrics.srct = Date.now();
  return content;
}

/*
 * User Sign-Up Payload and it changes for User Id & Table ID.
 */
async function getSignUpPayload(filePath, userId, tableId) {
  let content = JSON.parse(await readFile(filePath));
  content.userId = userId;
  content.id = uuidv4();
  content.requestId = uuidv4();
  content.metrics.uuid = uuidv4();
  content.metrics.ctst = Date.now();
  content.metrics.srct = Date.now();
  if (tableId) {
    //content.data.tableSessionId = tableId;
    content.metrics.tableId = tableId;
  }
  return content;
}

/*
 * Get Game Info Payload
 */
async function getGetGameInfo(filePath, userId, tableId) {
  let content = JSON.parse(await readFile(filePath));
  content.metrics.userId = userId;
  content.metrics.tableId = tableId;
  content.data.tableId = tableId;
  return content;
}

async function setMyCardsPayload(filePath, tableId) {
  let content = JSON.parse(await readFile(filePath));
  content.data.tableId = tableId;
  content.metrics.tableId = tableId;
  return content;
}

async function pickFromDeck(filePath, userId, tableId) {
  let content = JSON.parse(await readFile(filePath));
  content.data.tableId = tableId;
  content.metrics.tableId = tableId;
  content.metrics.userId = userId;
  return content;
}

async function firstUserTurnStart(filePath, userId, tableId) {
  let content = JSON.parse(await readFile(filePath));
  content.data.tableId = tableId;
  content.data.userId = userId;
  return content;
}

async function userTurnStart(filePath, userId, tableId) {
  let content = JSON.parse(await readFile(filePath));
  content.data.tableId = tableId;
  content.data.userId = userId;
  content.data.uid = userId;
  content.data.firstPick = isFirstUser || false;
  return content;
}

async function declareGame(
  filePath,
  userId,
  tableId,
  card,
  existing_cards,
) {
  let content = JSON.parse(await readFile(filePath));
  content.data.tableId = tableId;
  let testCards = [existing_cards];
  content.data.group = testCards;
  content.data.card = card;
  content.metrics.userId = userId;
  content.metrics.tableId = tableId;
  return content;
}

async function finishRound(
  filePath,
  userId,
  tableId,
  existing_cards,
) {
  let content = JSON.parse(await readFile(filePath));
  content.data.tableId = tableId;
  let testCards = [existing_cards];
  content.data.group = testCards;
  content.metrics.userId = userId;
  content.metrics.tableId = tableId;
  return content;
}

async function roundScoreCard(filePath, tableId, userId) {
  let content = JSON.parse(await readFile(filePath));
  content.data.tableId = tableId;
  content.metrics.tableId = tableId;
  content.metrics.userId = userId;
  return content;
}

async function discardCard(
  filePath,
  userId,
  tableId,
  existing_cards,
  card,
) {
  let content = JSON.parse(await readFile(filePath));
  content.data.tableId = tableId;
  content.data.card = card;
  content.data.group = existing_cards;
  content.metrics.userId = userId;
  content.metrics.tableId = tableId;
  return content;
}

async function leaveTable(filePath, userId, tableId) {
  let content = JSON.parse(await readFile(filePath));
  content.data.tableId = tableId;
  content.data.userId = userId;
  content.metrics.userId = userId;
  content.metrics.tableId = tableId;
  return content;
}

async function openGamePopup(filePath, userId, tableId, action) {
  let content = JSON.parse(await readFile(filePath));
  content.data.action = action;
  content.data.tableId = tableId;
  content.metrics.userId = userId;
  content.metrics.tableId = tableId;
  return content;
}

async function saveCards(filePath, userId, tableId, cards) {
  let content = JSON.parse(await readFile(filePath));
  content.data.gCards.dwd[0] = cards;
  content.metrics.userId = userId;
  content.metrics.tableId = tableId;
  return content;
}

async function groupCards(filePath, tableId, user_id, cards) {
  let content = JSON.parse(await readFile(filePath));
  content.data.tableId = tableId;
  content.data.group[0] = cards;
  content.metrics.userId = user_id;
  content.metrics.tableId = tableId;
  return content;
}

module.exports = {
  readFile,
  readContent,
  getSignUpPayload,
  getGetGameInfo,
  setMyCardsPayload,
  pickFromDeck,
  firstUserTurnStart,
  userTurnStart,
  saveCards,
  openGamePopup,
  discardCard,
  leaveTable,
  declareGame,
  groupCards,
  finishRound,
  roundScoreCard,
};
