"use strict";

const tg = require('telegram.link');
const TelegramPromise = require('./TelegramPromise');
const Utility = require('./Utility');

const DEFAULT_DATACENTER_PORT = 443;
const DEFAULT_LANGUAGE_CODE = 'en';
const SMS_TYPE_NUMERICAL = 0;
const SMS_TYPE_TELEGRAM = 5;
const MAX_LIMIT = 100;
const RATE_LIMIT_BACKOFF_TIME = 500;  // in ms

class TelegramClient {
  /**
   * Instantiate the client.
   *
   * Authentication keys are encrypted with the API hash.
   *
   * @param {int} appId -- `app_id` from https://my.telegram.org/apps
   * @param {String} hash -- `api_hash` from https://my.telegram.org/apps
   * @param {String} version -- app version
   * @param {String} [dataCenter] -- data center in `ip:port` format (default: production DC)
   * @param {String} [encryptedAuthKey] -- encrypted user auth key
   */
  constructor(appId, hash, version, dataCenter, encryptedAuthKey) {
    this.appId = appId;
    this.hash = hash;
    this.version = version;

    if (dataCenter) {
      let dcPieces = dataCenter.split(':');
      this.dataCenter = {
        host: dcPieces[0],
        port: dcPieces.length > 1 ? dcPieces[1] : DEFAULT_DATACENTER_PORT
      };
    } else {
      this.dataCenter = tg.PROD_PRIMARY_DC;
    }

    if (encryptedAuthKey) {
      this.authKey = tg.retrieveAuthKey(new Buffer(encryptedAuthKey, 'hex'), hash);
    }
  }

  /**
   * Connect to Telegram. If necessary, create an authorization key.
   *
   * @return {Promise}
   */
  connect() {
    return new Promise((resolve, reject) => {
      let app = {
        id: this.appId,
        hash: this.hash,
        version: this.version,
        langCode: DEFAULT_LANGUAGE_CODE,
        deviceModel: '(n/a)',
        systemVersion: '(n/a)',
        authKey: this.authKey
      };

      this.client = tg.createClient(app, this.dataCenter, (e) => {
        if (e) {
          return reject(e);
        }

        if (this.client.isReady()) {
          // Nothing else to do.
          return resolve();
        }

        // Create MTProto auth key before resolving.
        this.client.createAuthKey((authKey) => {
          this.authKey = authKey;
          resolve();
        });
      });
    });
  }

  /**
   * Send login code to a phone number.
   * 
   * @param {String} phoneNumber
   * @return {TelegramPromise}
   */
  sendLoginCode(phoneNumber) {
    return new TelegramPromise((resolve, reject) => this.client.auth.sendCode(phoneNumber, SMS_TYPE_TELEGRAM, DEFAULT_LANGUAGE_CODE, resolve));
  }

  /**
   * Login to Telegram. If successful, this will associate the current authorization key with the user.
   * 
   * @param {String} phoneNumber
   * @param {String} phoneCodeHash -- value from sendCode()
   * @param {String} phoneCode -- value sent to user via SMS or Telegram
   * @return {TelegramPromise} 
   */
  signIn(phoneNumber, phoneCodeHash, phoneCode) {
    return new TelegramPromise((resolve, reject) => this.client.auth.signIn(phoneNumber, phoneCodeHash, phoneCode, resolve));
  }

  /**
   * Fetch a hash of all data centers in `dcNumber => host:port` format.
   * 
   * @return {Promise}
   */
  getDataCenters() {
    return new Promise((resolve, reject) => {
      this.client.getDataCenters((res) => {
        let keys = Object.keys(res);
        let ret = {};

        for (let key of keys) {
          let matches = key.match(/\d+/);

          if (matches) {
            let dc = res[key];
            ret[matches[0]] = `${dc.host}:${dc.port}`;
          }
        }

        resolve(ret);
      });
    });
  }

  /**
   * Dialogs are exchanges on Telegram (whether via direct message or group chat).
   *
   * `.count` is the total number of dialogs.
   *
   * `dialogs.list` is an array containing information about dialogs (peer, last message ID, number of unread messages, etc).
   * @see https://core.telegram.org/constructor/dialog
   *
   * `messages.list` is an array containing the most recent message from dialogs.
   * @see https://core.telegram.org/type/Message
   *
   * `chats.list` is an array containing information about chat dialogs (chat ID, title, participant count, etc).
   * @see https://core.telegram.org/type/Chat
   *
   * `users.list` is an array containing information about users participating in direct messages and chats.
   * @see https://core.telegram.org/type/User
   *
   * @see https://rawgit.com/enricostara/telegram.link/master/doc/api/messages.html#section-10
   * @see https://core.telegram.org/constructor/messages.dialogsSlice
   * @param {int} [offset=0] -- number of dialogs to skip
   * @param {int} [limit=MAX_LIMIT]
   * @return {TelegramPromise}
   */
  getDialogsSlice(offset, limit) {
    offset = offset || 0;
    limit = limit || MAX_LIMIT;

    App.debug(`Fetching dialogs (offset ${offset}, limit ${limit})`);
    return new TelegramPromise((resolve, reject) => this.client.messages.getDialogs(offset, 0, limit, resolve));
  }

  /**
   * Fetch a page of message history for a peer.
   *
   * @see https://rawgit.com/enricostara/telegram.link/master/doc/api/messages.html#section-14
   * @see https://core.telegram.org/method/messages.getHistory
   * @param {Object} inputPeer -- Telegram InputPeer type
   * @param {int} [offset=0] -- number of messages to skip (default 0)
   * @param {int} [limit=MAX_LIMIT] -- (default MAX_LIMIT)
   * @return {TelegramPromise}
   */
  getHistorySlice(inputPeer, offset, limit) {
    offset = offset || 0;
    limit = limit || MAX_LIMIT;

    App.debug(`Fetching peer history (offset ${offset}, limit ${limit}) for peer`, inputPeer.user_id || inputPeer);
    return new TelegramPromise((resolve, reject) => this.client.messages.getHistory(inputPeer, offset, 0, limit, resolve));
  }

  /**
   * Automatically traverse a paginated endpoint to the end.
   * `fn` must be a function where `offset` and `limit` are the only arguments.
   *
   * @param {Function} fn -- function or generator to call
   * @param {int} [offset=0}
   * @param {Function} [breaker] -- invoked per page with results, stops traversal if true
   * @return {Array} responses
   */
  *traverse(fn, offset, breaker) {
    offset = offset || 0;

    let totalRecords;
    let limit = MAX_LIMIT;
    let ret = [];

    do {
      // App.debug(`Calling function ${fn.name} with offset ${offset}, limit ${limit}`);
      let res = yield fn(offset, limit);

      if (_.isUndefined(totalRecords)) {
        if (_.isUndefined(res.count)) {
          // This is not documented, but it seems if `res.count` does not exist on the first request, we have everything
          App.debug(`All records received in one page`);
          ret.push(res);
          break;
        }

        totalRecords = res.count;
        App.debug(`A total of ${totalRecords} records exist, paging until completion`);
      } else if (!_.isObject(res) || _.isUndefined(res.count)) {
        App.log('Got unexpected response during pagination', res);
        throw new Error('Received unexpected response during pagination.');
      } else if (_.isFunction(breaker) && breaker(res)) {
        App.debug('Breaker tripped, halting further traversal.');
        ret.push(res);
        break;
      }

      ret.push(res);
      offset += limit;

      if (offset <= totalRecords) {
        // We need to make another request, sleep to avoid hitting the rate limit
        yield Utility.sleep(RATE_LIMIT_BACKOFF_TIME);
      }
    } while (offset <= totalRecords);

    App.debug(`Got ${ret.length} responses`);
    return ret;
  }
}

module.exports = TelegramClient;