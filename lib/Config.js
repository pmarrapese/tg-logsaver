"use strict";

const Boilerplate = require('@pmarrapese/node-boilerplate');

class Config extends Boilerplate.Config {
  get defaultConfigFilename() {
    return 'tg-logsaver.json';
  }

  get defaultConfig() {
    return {
      app: {
        id: '',
        hash: '',
        dataCenter: ''
      },
      user: {
        encryptedAuthKey: ''
      }
    }
  }
}

module.exports = Config;