"use strict";

const Boilerplate = require('@pmarrapese/node-boilerplate');

class Config extends Boilerplate.Config {
  get defaultConfigDirectory() {
    return './config/';
  }

  get defaultConfig() {
    return {
      app: {
        id: '',
        hash: '',
        dataCenter: ''
      },
      user: {
        authKey: {
          id: '',
          value: ''
        }
      }
    }
  }
}

module.exports = Config;