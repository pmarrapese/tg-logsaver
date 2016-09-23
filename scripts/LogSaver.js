/**
 * Save all user logs for the currently authorized Telegram account.
 */

"use strict";

const TelegramUser = require('../lib/TelegramUser');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const EventEmitter = require('events').EventEmitter;
const ProgressBar = require('progress');

class LogSaver extends require('../lib/App') {
  *run() {
    this.emitter = new EventEmitter();

    if (!App.isDebugging) {
      this.progressBar = new ProgressBar(`[:bar] (ETA: :eta s)`, {
        width: process.stdout.columns,
        total: 100,
        complete: '=',
        incomplete: ' '
      });

      this.emitter.on('progress', (percent) => this.progressBar.update(percent));
    }

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
      this.log(`Fetching history for ${user.fullName || user.displayName}`);
      let peer = user.inputPeer;

      if (!peer) {
        // We don't know how to handle this type of peer.
        this.log(`No InputPeer type known for user ${userId} -- skipping`, user);
        continue;
      }

      // Determine base directory.
      let baseLogPath = user.baseLogPath;
      mkdirp.sync(baseLogPath);

      // Get message history for this user.
      let messagesByDate = {};

      try {
        messagesByDate = yield this.getMessagesByDateForPeer(peer, user.lastSaveDate);
      } catch (e) {
        this.log(`Got error for user ${userId}: ${e.message} -- skipping`, e.stack);
        continue;
      }

      // Save logs for each date.
      for (let date in messagesByDate) {
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
        }).join("\n");

        // Write file
        let filePath = baseLogPath + path.sep + `${date}.txt`;
        fs.writeFileSync(filePath, lines);
      }

      this.debug(`Done with ${user.fullName || user.displayName} (${Object.keys(messagesByDate).length} day(s) of messages saved to ${baseLogPath})`);
    }

    this.log('Done saving logs.');
  }

  /**
   * Fetch & group message history for a peer.
   *
   * @param {Object} peer
   * @param {String} [since] -- fetch only messages on or after this date (YYYY-MM-DD format)
   * @return {Object} messages grouped by day, sorted chronologically.
   */
  *getMessagesByDateForPeer(peer, since) {
    /**
     * Per-page callback. Raise status events & only download what we need.
     *
     * @param {Object} res -- getHistorySlice response
     * @return {Boolean} -- true to break traversal
     */
    let offset = 0;

    let breaker = (res) => {
      // Update the progress bar.
      offset += res.messages.list.length;
      this.emitter.emit('progress', offset / res.count);

      if (!since) {
        return;
      }

      // Only download what we need.
      for (let message of res.messages.list) {
        let messageDate = moment(message.date * 1000).format('YYYY-MM-DD');

        if (messageDate < since) {
          // We don't need any more pages.
          App.debug(`Not paging anymore, we have all new messages on or after ${since}`);
          return true;
        }
      }
    };

    this.emitter.emit('progress', 0);
    let responses = yield this.client.traverse(this.client.getHistorySlice.bind(this.client, peer), 0, breaker);
    this.emitter.emit('progress', 100);

    // Group messages by day.
    let messagesByDate = {};

    for (let response of responses) {
      for (let message of response.messages.list) {
        let messageDate = moment(message.date * 1000).format('YYYY-MM-DD');

        if (since && messageDate < since) {
          // This is before the date we care about, drop the message.
          //App.debug('Skipping message in fetched page from', messageDate);
          continue;
        }

        if (!messagesByDate[messageDate]) {
          messagesByDate[messageDate] = [];
        }

        messagesByDate[messageDate].push(message);
      }
    }

    // Sort messages chronologically.
    for (let date in messagesByDate) {
      messagesByDate[date] = _.sortBy(messagesByDate[date], 'id');
    }

    return messagesByDate;
  }
}

module.exports = LogSaver;