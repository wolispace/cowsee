import fs from 'fs';
import { Utilities } from './Utilities.js';

/**
 * Generate sequential IDs starting at 0 and incrementing in base62 or whatever we have set the alphabet to be
 * The 16,777,216th object will be id '9999' so plenty of growth wile taking up very little space 
 */
export class IdManager {
  filename = '_data/id_counter.json';
  counter = 0;
  // if alphabet is 62 char long then we are doing base62 encoding
  alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  constructor() {
    this.load();
  }

  /**
   * Load the last saved counter so we continue where we left off
   * @returns 
   */
  load() {
    if (!fs.existsSync(this.filename)) {
      this.counter = 0;
      return;
    }
    this.counter = 0 + fs.readFileSync(this.filename);
  }

  /**
   * Save the counter
   */
  save() {
    fs.writeFileSync(this.filename, `${this.counter}`);
  }

  /**
   * Create a new ID - siquential number encoded
   * @returns {string}
   */
  new() {
    const utils = new Utilities();

    const id = this.encodeInt(this.counter);
    this.counter++;
    this.save();
    utils.log('id', id);
    return id;
  }

  // encode the interger into base 62 (or whatever the aphabet is long)
  encodeInt(num) {
    const base = this.alphabet.length;

    // Special case for zero
    if (num === 0) return this.alphabet[0];

    // Compute number of digits directly
    const digits = Math.floor(Math.log(num) / Math.log(base)) + 1;

    let str = "";
    let placeValue = Math.pow(base, digits - 1);

    for (let i = 0; i < digits; i++) {
      const digit = Math.floor(num / placeValue);
      str += this.alphabet[digit];
      num = num % placeValue;
      placeValue = placeValue / base;
    }

    return str;
  }

  // decode the interger out of base 62 (or whatever the aphabet is long)
  decodeInt(str) {
    const base = this.alphabet.length;
    let num = 0;

    for (let i = 0; i < str.length; i++) {
      const digit = this.alphabet.indexOf(str[i]);
      if (digit < 0) throw new Error("Invalid character in base-N string");
      num = num * base + digit;
    }

    return num;
  }

};

