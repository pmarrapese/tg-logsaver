/**
 * Wrapper class for Telegram user objects.
 */

"use strict";

const TelegramInputPeer = require('./TelegramInputPeer');
const path = require('path');
const fs = require('fs');

const USER_TYPE_SELF = 'Self';
const USER_TYPE_CONTACT = 'Contact';
const USER_TYPE_REQUEST = 'Request';
const USER_TYPE_FOREIGN = 'Foreign';
const USER_TYPE_DELETED = 'Deleted';

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

    // TODO: need to determine how to handle deleted users
    switch (userType) {
      case USER_TYPE_SELF:
        return TelegramInputPeer.newSelfInputPeer();
      case USER_TYPE_CONTACT:
        return TelegramInputPeer.newContactInputPeer(this._user.id);
      case USER_TYPE_FOREIGN:
      case USER_TYPE_REQUEST:
        return TelegramInputPeer.newForeignInputPeer(this._user.id, this._user.access_hash);
      default:
        App.log(`Unknown InputPeer type ${this._user._typeName}`, this._user);
        return undefined;
    }
  }
}

module.exports = TelegramUser;