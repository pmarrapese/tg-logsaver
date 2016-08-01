/**
 * Save all user logs for the currently authorized Telegram account.
 */

"use strict";

const TelegramUser = require('../lib/TelegramUser');
const Utility = require('../lib/Utility');
const moment = require('moment');
const fs = require('fs');
const mkdirp = require('mkdirp');

const APP_VERSION = require('../package.json').version;

class LogSaver extends require('../lib/App') {
  *run() {
    try {
      yield this.connect();
      yield this.getUsers();
      yield this.saveLogs();
    } catch (e) {
      switch (e.code) {
        case 401:
          App.die('Your authorization key has expired. Please re-run the authorization script.', `(${e.message})`);
      }

      App.die(e);
    }

    process.exit(0);
  }

  /**
   * Enumerate users we're interested in by examining all dialogs.
   * We don't use our contact list here because we may have dialogs with non-contacts.
   */
  *getUsers() {
    // Fetch all dialogs and users.
    let responses = yield this.client.traverse(this.client.getDialogsSlice.bind(this.client));
    this.dialogUserIds = [];    // IDs of users we have dialogs with
    this.allUsers = {};         // all user objects

    for (let response of responses) {
      for (let user of response.users.list) {
        this.allUsers[user.id] = new TelegramUser(user);
      }

      for (let dialog of response.dialogs.list) {
        if (dialog.peer && dialog.peer.user_id) {
          this.dialogUserIds.push(dialog.peer.user_id);
        }
      }
    }

    this.dialogUserIds = this.dialogUserIds.sort((a, b) => a - b);  // sort by ascending user ID
    this.log(`Discovered ${this.dialogUserIds.length} user dialogs.`);
  }

  /**
   * Save all message history for all users we have dialogs with.
   */
  *saveLogs() {
    for (let userId of this.dialogUserIds) {
      let user = this.allUsers[userId];
      this.log(`Fetching history for ${user.fullName}`);
      let peer = user.inputPeer;

      if (!peer) {
        // We don't know how to handle this type of peer.
        this.log(`No InputPeer type known for user ${userId} -- skipping`, user);
        continue;
      }

      // Get all message history for this user.
      let responses;

      try {
        responses = yield this.client.traverse(this.client.getHistorySlice.bind(this.client, peer));
      } catch (e) {
        this.log(`Got error for user ${userId}: ${e.message} -- skipping`, e.stack);
        continue;
      }

      // Group messages by day.
      let messagesByDate = {};

      for (let response of responses) {
        for (let message of response.messages.list) {
          let date = moment(message.date * 1000).format('YYYY-MM-DD');

          if (!messagesByDate[date]) {
            messagesByDate[date] = [];
          }

          messagesByDate[date].push(message);
        }
      }

      // Create base directory
      let basePath = `./logs/${user.directoryName}`;
      mkdirp.sync(basePath);

      // Save logs for each date.
      let dates = Object.keys(messagesByDate);

      for (let date of dates) {
        // Sort messages chronologically.
        messagesByDate[date] = _.sortBy(messagesByDate[date], 'id');

        // Format each line for this day.
        let lines = _.map(messagesByDate[date], (message) => {
          let sender = this.allUsers[message.from_id];
          let timestamp = moment(message.date * 1000).format('HH:mm:ss');
          let contents;

          switch (message.media._typeName) {
            case 'api.type.MessageMediaEmpty':
              contents = message.message;
              break;
            case 'api.type.MessageMediaPhoto':
            case 'api.type.MessageMediaVideo':
            case 'api.type.MessageMediaGeo':
            case 'api.type.MessageMediaContact':
            case 'api.type.MessageMediaDocument':
            case 'api.type.MessageMediaAudio':
              contents = `<< ${message.media._typeName.substr(21)} >>`;
              break;
            default:
              contents = `<< unknown media >>`;
          }

          return `[${timestamp}] ${sender.displayName}: ${contents}`;
        });

        // Write file
        fs.writeFileSync(`${basePath}/${date}.txt`, lines.join("\n"));
      }

      this.log(`Done with ${user.fullName} (${dates.length} day(s) of messages saved to ${basePath}`);
    }

    this.log('Done saving logs.');
  }
}

module.exports = LogSaver;