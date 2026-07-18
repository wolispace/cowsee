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

  isString(v) {
    return typeof v === "string" || v instanceof String;
  }

  isObject(v) {
    return v !== null && typeof v === "object" && !this.isString(v);
  }

  interpolate(data, paintext = false) {
    console.log(data);
    if (data.msg) {
      // Interpolate object templates: {ID} (defaults to longname) or {ID.attribute}
      data.msg = data.msg.replace(/\{(\w+)(?:\.(\w+))?\}/g, (match, id, attr) => {
        const obj = data.objs?.[id];
        if (!obj) return match;

        const prop = attr || 'longname';
        let val = obj[prop] !== undefined ? obj[prop] : '';

        // Special handling if the player/actor matches the object ID (e.g. 'w' -> wolis)
        if (prop === 'longname' && data.context && id === data.context.player) {
          val = `${val} (you)`;
        }
        if (paintext) {
          return val;
        }

        // Format value with styling if colour is defined
        const color = obj.colour || obj.color;
        let styled = val;
        if (color && val !== '') {
          styled = `<span style="color: ${color}">${val}</span>`;
        }

        // Wrap in clickable link if object is linkable

        return `<a href="#" class="obj-link" data-id="${val}" title="Examine ${val}">${styled}</a>`;
        return styled;
      });

      data.msg = data.msg.replace(/\s+/g, ' ').trim();
    }
    return data.msg;
  }
}
