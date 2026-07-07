import fs from 'fs';

/**
 * This class holds a bunch of random utilities everyone can enjoy
 */
export class Utilities {
  logfile = '_server.log';
  
  /**
   * Logs to the server log, and the console, a timestamped line of text
   * @param  {...any} args 
   */
  log(...args) {
    const line = `${new Date().toISOString()} ${args.join(' ')}\n`;
   // process.stdout.write(line);
    fs.appendFileSync(this.logfile, line);
  };

  /**
   * Generate a random number form 0 to max eg 0 - 10
   * @param {int} max 
   * @returns {int}
   */
  random(max = 1) {
    return Math.floor(Math.random() * max);
  }

  /**
   * Removes wrapping quotes from the string eg '"hello"' becomes: 'hello'
   * - will cwork with enything like {hello} or [hello]
   * - will clobber unquoted strings so hello becomes ell 
   * @param {string} msg 
   * @returns {string}
   */
  trimQuotes(msg) {
    return msg.substring(1, msg.length - 1);
  }
}
