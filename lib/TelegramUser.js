/**
 * Wrapper class for Telegram user objects.
 */

"use strict";

const tg = require('telegram.link');
const path = require('path');
const fs = require('fs');

const USER_TYPE_SELF = 'Self';
const USER_TYPE_CONTACT = 'Contact';
const USER_TYPE_REQUEST = 'Request';
const USER_TYPE_FOREIGN = 'Foreign';
const USER_TYPE_DELETED = 'Deleted';
const INPUT_PEER_TYPE_SELF = 'Self';
const INPUT_PEER_TYPE_CONTACT = 'Contact';
const INPUT_PEER_TYPE_FOREIGN = 'Foreign';
const INPUT_PEER_TYPE_CHAT = 'Chat';

class TelegramUser {
  /**
   * @param {Object} user
   */
  constructor(user) {
    this._user = user;
  }

  /**
   * @return {int}
   */
  get id() {
    return this._user.id;
  }

  /**
   * Get the user's first and last name.
   *
   * @return {String}
   */
  get fullName() {
    return `${this._user.first_name} ${this._user.last_name}`.trim();
  }

  /**
   * Get the user's display name.
   *
   * Priority: Full name (or just first/last) -> username -> phone -> user ID
   *
   * @return {String}
   */
  get displayName() {
    return this.fullName || this._user.username || this._user.phone || `User ${this._user.id}`;
  }

  /**
   * Get the user's directory name.
   * If no username exists, prefer phone number over display name because it's more unique.
   *
   * Priority: Username -> phone -> Full name (or just first/last) -> user ID
   *
   * @return {String}
   */
  get directoryName() {
    return this._user.username || this._user.phone || this.fullName || `User ${this._user.id}`;
  }

  /**
   * Get the user's (relative) log path.
   *
   * @return {String}
   */
  get baseLogPath() {
    return '.' + path.sep + 'logs' + path.sep + this.directoryName;
  }

  /**
   * Get the most recently saved log filename for this user.
   *
   * @return {String|undefined}
   */
  get lastSaveDate() {
    let oldLogs = fs.readdirSync(this.baseLogPath)
      .filter((filename) => filename.match(/\d{4}-\d{2}-\d{2}.txt/)); // filter out non-dates

    return oldLogs.length ? oldLogs[oldLogs.length - 1].substr(0, 10) : undefined;
  }

  /**
   * Convert a user object to its respective InputPeer object.
   *
   * @return {Object|undefined} InputPeer if applicable
   */
  get inputPeer() {
    let userType = this._user._typeName.substr(13); // remove 'api.type.User' prefix

    switch (userType) {
      case USER_TYPE_SELF:
        return TelegramUser._newInputPeer(INPUT_PEER_TYPE_SELF);
      case USER_TYPE_CONTACT:
      case USER_TYPE_DELETED: // this worked for both a pre-delete "contact"-type user and pre-delete "foreign"-type user
        return TelegramUser._newInputPeer(INPUT_PEER_TYPE_CONTACT, {
          user_id: this._user.id
        });
      case USER_TYPE_FOREIGN:
      case USER_TYPE_REQUEST:
        return TelegramUser._newInputPeer(INPUT_PEER_TYPE_FOREIGN, {
          user_id: this._user.id,
          access_hash: this._user.access_hash
        });
      default:
        App.log(`Unknown InputPeer type ${this._user._typeName}`, this._user);
        return undefined;
    }
  }

  /**
   * Create a Telegram InputPeer type.
   *
   * @example https://rawgit.com/enricostara/telegram.link/master/doc/api/messages.html#section-14
   * @see https://core.telegram.org/type/InputPeer
   * @param {String} type -- an InputPeer type constant
   * @param {Object} [props={}] -- any properties
   * @return {Object}
   * @private
   */
  static _newInputPeer(type, props) {
    props = props || {};

    return new tg.type[`InputPeer${type}`]({
      props: props
    });
  }
}

module.exports = TelegramUser;