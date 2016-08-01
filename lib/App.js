"use strict";

const Boilerplate = require('@pmarrapese/node-boilerplate');
const Config = require('./Config');
const TelegramClient = require('./TelegramClient');
const util = require('util');

const APP_VERSION = require('../package.json').version;

class App extends Boilerplate.App {
  before() {
    global.App = this;

    // HACK: pending TG callbacks don't seem to keep the app alive. this fixes that.
    setInterval(_.noop, 10000);

    // HACK: Squelch chatty Telegram library logging (the library doesn't allow muting of info/warn/error)
    let logger = require('get-log')('net.EncryptedRpcChannel');
    logger.info = _.noop;

    this.config = new Config();
  }

  /**
   * Create our client and connect to Telegram.
   *
   * @param {Boolean} [auth=true] -- authenticate to telegram
   */
  *connect(auth) {
    auth = _.isUndefined(auth) ? true : auth;

    if (auth && !this.config.user.encryptedAuthKey) {
      return this.die('You are not logged in to Telegram. Please run "node ./ auth" to login.');
    }

    this.client = new TelegramClient(this.config.app.id, this.config.app.hash, APP_VERSION, this.config.app.dataCenter, auth ? this.config.user.encryptedAuthKey : undefined);
    this.debug(`Connecting to Telegram (${this.client.dataCenter.host})...`);
    yield this.client.connect();
    this.debug('Connected.');
  }

  /**
   * Log a message.
   *
   * @param {...*} [arguments] -- arbitrary number of arguments
   */
  log() {
    let args = _.map(arguments, (arg) => {
      if (_.isObject(arg)) {
        return util.inspect(arg, {
          depth: null,
          colors: true
        });
      }

      return arg;
    });

    let time = new Date().toTimeString().split(' ', 1)[0];
    args.unshift(`[${time}]`);
    console.log.apply(this, args);
  }
}

module.exports = App;