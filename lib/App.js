"use strict";

const Boilerplate = require('@pmarrapese/node-boilerplate');
const Config = require('./Config');
const util = require('util');

class App extends Boilerplate.App {
  before() {
    global.App = this;

    // HACK: pending TG callbacks don't seem to keep the app alive. this fixes that.
    setInterval(_.noop, 10000);

    // HACK: Squelch chatty Telegram library logging (the library doesn't allow muting of info/warn/error)
    let logger = require('get-log')('net.EncryptedRpcChannel');
    logger.info = _.noop;

    // Enable TG library debugging.
    // if (this.isDebugging) {
    //   process.env['DEBUG'] = '*';
    // }
    
    this.config = new Config();
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