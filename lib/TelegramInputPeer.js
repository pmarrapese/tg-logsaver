/**
 * Utility class for creating Telegram InputPeer types.
 *
 * @example https://rawgit.com/enricostara/telegram.link/master/doc/api/messages.html#section-14
 * @see https://core.telegram.org/type/InputPeer
 */

"use strict";

const tg = require('telegram.link');

const INPUT_PEER_TYPE_SELF = 'Self';
const INPUT_PEER_TYPE_CONTACT = 'Contact';
const INPUT_PEER_TYPE_FOREIGN = 'Foreign';
const INPUT_PEER_TYPE_CHAT = 'Chat';

class TelegramInputPeer {
  /**
   * @param {String} type -- an InputPeer type constant
   * @param {Object} [props={}] -- any properties
   * @private
   */
  static _newInputPeer(type, props) {
    props = props || {};

    return new tg.type[`InputPeer${type}`]({
      props: props
    });
  }

  /**
   * @return {Object}
   */
  static newSelfInputPeer() {
    return this._newInputPeer(INPUT_PEER_TYPE_SELF);
  }

  /**
   * @param {int} userId
   * @return {Object}
   */
  static newContactInputPeer(userId) {
    return this._newInputPeer(INPUT_PEER_TYPE_CONTACT, {
      user_id: userId
    });
  }

  /**
   * @param {int} userId
   * @param {String} accessHash
   * @return {Object}
   */
  static newForeignInputPeer(userId, accessHash) {
    return this._newInputPeer(INPUT_PEER_TYPE_FOREIGN, {
      user_id: userId,
      access_hash: accessHash
    });
  }

  /**
   * @param {int} chatId
   * @return {Object}
   */
  static newChatInputPeer(chatId) {
    return this._newInputPeer(INPUT_PEER_TYPE_CHAT, {
      chat_id: chatId
    });
  }
}

module.exports = TelegramInputPeer;