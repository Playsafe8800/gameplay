/* eslint-disable */
'use strict';

//var fs = require('fs');

/**
 * To check whether the json object contains empty object or not
 * @param {*} obj
 * @returns
 */
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

module.exports = {
  isEmpty,
};
