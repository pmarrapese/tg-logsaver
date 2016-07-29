/**
 * Enhanced error class for Telegram errors.
 */

"use strict";

class TelegramError extends Error {
  /**
   * @param {*} [message]
   * @param {*} [code]
   * @param {*|Array} [traces] -- stack traces (newest to oldest)
   * @param {*} [response] -- telegram response
   */
  constructor(message, code, traces, response) {
    super(message);
    this.message = this.message || '(no message)';
    this.code = code || '(no code)';

    if (!_.isUndefined(traces)) {
      if (!_.isArray(traces)) {
        traces = [traces];
      }

      this.traces = traces;
    }

    this.response = response;
  }

  /**
   * Instantiate an error from Telegram response.
   *
   * @param {*} [res] -- telegram response
   * @param {*} [traces] -- stack traces (newest to oldest)
   * @return {TelegramError}
   */
  static fromResponse(res, traces) {
    let code, message;

    if (_.isObject(res)) {
      code = res.error_code;
      message = res.error_message;
    }

    return new TelegramError(message, code, traces, res);
  }
}

module.exports = TelegramError;