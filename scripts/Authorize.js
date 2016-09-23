/**
 * Authorize the application to use a Telegram account.
 */

"use strict";

const Utility = require('../lib/Utility');

class Authorize extends require('../lib/App') {
  *run() {
    yield this.getAppCredentials();
    yield this.connect(false);
    yield this.sendLoginCode();
    yield this.login();
    this.saveAuthKey();
    process.exit(0);
  }

  /**
   * Prompt for the user's Telegram app ID and app hash.
   */
  *getAppCredentials() {
    let appId = yield Utility.question('Please enter your Telegram app ID (obtainable at https://my.telegram.org/apps):');
    this.config.app.id = appId || this.config.app.id;

    let appHash = yield Utility.question('Please enter your Telegram app hash (obtainable at https://my.telegram.org/apps):');
    this.config.app.hash = appHash || this.config.app.hash;
  }

  /**
   * Prompt for the user's phone number and send the login code.
   */
  *sendLoginCode() {
    let res;
    this.phoneNumber = yield Utility.question('Enter phone number (format: +12223334444):');

    this.debug('Sending login code...');

    try {
      res = yield this.client.sendLoginCode(this.phoneNumber);
    } catch (e) {
      // Static message handling
      switch (e.message) {
        case 'CONNECTION_API_ID_INVALID':
        case 'API_ID_INVALID':
          return this.die('Your Telegram app configuration does not appear to be correct. Please verify the app ID and hash are correct.');
        case 'PHONE_NUMBER_INVALID':
          return this.die('Invalid phone number.');
        case 'PHONE_PASSWORD_PROTECTED':
          return this.die('2-step verification is not currently supported. Please try disabling 2-step verification before authorizing.');
      }

      // Dynamic message & unhandled error handling
      switch (true) {
        case /PHONE_MIGRATE/.test(e.message):
        case /NETWORK_MIGRATE/.test(e.message):
          // We need to switch data centers.
          let dcNumber = e.message.substr(-1, 1);
          yield this.saveDataCenter(dcNumber);

          return this.die(`You have been switched to data center ${dcNumber} (${this.config.app.dataCenter}). Please restart the script.`);

        default:
          // Unhandled error.
          return this.die(e);
      }
    }

    if (!res.phone_registered) {
      return this.die(`${this.phoneNumber} does not appear to be registered with Telegram.`);
    }

    this.phoneCodeHash = res.phone_code_hash;

    this.log('Login code successfully sent.');
  }

  /**
   * Prompt for the user's login code and login to Telegram.
   */
  *login() {
    let res;

    while (!res) {
      let phoneCode = yield Utility.question('Please enter the login code.');
      this.debug('Signing in to Telegram...');

      try {
        res = yield this.client.signIn(this.phoneNumber, this.phoneCodeHash, phoneCode);
      } catch (e) {
        switch (e.code) {
          case 400:
            this.log('Invalid login code, please re-enter.');
            continue;
          default:
            this.die(e);
        }
      }
    }

    this.log('Successfully signed in.');
  }

  /**
   * Write authorization key to the configuration file.
   */
  saveAuthKey() {
    this.debug('Updating config with auth key...');
    this.config.user.encryptedAuthKey = this.client.authKey.key.encrypt(this.config.app.hash).toString('hex');
    this.config.write();
    this.log('Config updated.');
  }

  /**
   * Update the config file with the desired data center IP.
   *
   * @param {int|String} dcNumber -- number of the data center to use
   */
  *saveDataCenter(dcNumber) {
    this.debug('Fetching data center list...');
    let dcs = yield this.client.getDataCenters();

    if (!dcs[dcNumber]) {
      throw new Error(`Data center ${dcNumber} does not exist.`);
    }

    this.debug(`Updating config with new data center (${dcs[dcNumber]})`);
    this.config.app.dataCenter = dcs[dcNumber];
    this.config.write();
    this.debug('Config updated.');
  }
}

module.exports = Authorize;