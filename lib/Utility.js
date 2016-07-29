"use strict";

const readline = require('readline');

class Utility {
  /**
   * Sleep for x milliseconds.
   *
   * @param {int} ms
   * @return {Promise}
   */
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Prompt the user.
   *
   * @param {String} question
   * @return {Promise}
   */
  static question(question) {
    question += '\n';

    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => rl.question(question, (res) => {
      rl.close();
      resolve(res);
    }));
  }
}

module.exports = Utility;