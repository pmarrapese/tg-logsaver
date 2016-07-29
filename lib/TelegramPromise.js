/**
 * Promise wrapper for Telegram requests. Automatically constructs errors and handles rejections on request failure.
 */

"use strict";

const TelegramError = require('./TelegramError');

class TelegramPromise extends Promise {
  constructor(executor) {
    let preTrace = new Error(); // include stack trace information for increased debuggability

    super(function(resolve, reject) {
      function onError(e) {
        let postTrace = new Error();
        reject(TelegramError.fromResponse(e, [postTrace, preTrace]));
      }

      new Promise(executor)
        .then(function(res) {
          if (res && res.error_code) {
            return onError(res);
          }

          resolve(res);
        })
        .catch(onError);
    });
  }
}

module.exports = TelegramPromise;