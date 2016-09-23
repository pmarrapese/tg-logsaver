#!/usr/bin/env node

"use strict";

global._ = require('lodash');

let action = process.argv.length >= 3 ? process.argv[2] : 'save';
let App;

switch (action.toLowerCase()) {
  case 'authorize':
  case 'auth':
    App = require('./scripts/Authorize');
    break;
  case 'save':
    App = require('./scripts/LogSaver');
    break;
  default:
    throw new Error(`Invalid action specified: "${action}"`);
}

new App({
  isDebugging: false
});