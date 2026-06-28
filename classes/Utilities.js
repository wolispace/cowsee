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
    process.stdout.write(line);
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



}
