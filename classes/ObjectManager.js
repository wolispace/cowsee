import fs from 'fs';
import path from 'path';
import { IdManager } from './IdManager.js';
import { PoolManager } from './PoolManager.js';

/**
 * 
 */
export class ObjectManager {
  idManager = new IdManager();
  pools = {};

  constructor(tickManager) {
    this.tickManager = tickManager;
    for (const key of ['id', 'name', 'code', 'loc']) {
      const type = ['id', 'code'].includes(key) ? 'map' : 'set';
      this.pools[key] = new PoolManager(tickManager, key, type);
    }
  }

  /**
   * Returns the whole object from a chunked file
   * @param {string} id 
   * @returns {object}
   */
  getById(id) {
    return this.pools.id.get(id);
  };

  /**
   * Returns an array of IDs with the required word eg: "cat" returns ["AB", "Ax" ...]
   * @param {string} key 
   * @returns {array} of IDs with this name
   */
  findByName(key) {
    return this.pools.name.get(key);
  };

  /**
   * Returns an array of object IDs in the location
   * @param {string} key 
   * @returns {array}
   */
  findInLoc(key) {
    return this.pools.loc.get(key);
  }

  findMatchInLoc(obj, context) {
    // TODO: for creating a new object that merges with an existing
    // loop through all objects in the location and if they match the obj.class, obj.colour etc..
    // then return it else return null
  }

  /**
   * Retruns the code for the object.id passed in
   * for consistancy, even tho its just a string, its stored in an array with one element
   * @param {id} id 
   * @returns {string}
   */
  getCode(id) {
    const codeObj = this.pools.code.get(id);
    return codeObj?.code ?? '';
  };

  /**
   * Find the first named command (look in player then location then globaly so long as its a command)
   * "find" means look for it somewhere, where as "get" means we know it so get it.
   * @param {string} firstword 
   * @param {object} context 
   * @returns {string} return the code from the bext match object
   */
  findCommand(firstword, context) {
    const ids = this.findByName(firstword);
    console.log(`find ids for ${firstword} `, ids);

    if (!ids || ids.length < 1) return;
    if (ids.length === 1) {
      return this.getCode(ids[0]);
    }
    for (let index = 0; index < ids.length; index++) {
      const obj = ids[index];
      if (obj.loc === context.actor) {
        return obj.code;
      }
      if (obj.loc === context.loc) {
        return obj.code;
      }
      if (obj.class === 'command') {
        return obj.code;
      }
    }
    return '';
  };

  /**
   * Add the object to all of the pools
   * @param {obj} obj 
   */
  addToPools(obj) {
    this.pools.id.set(obj.id, obj);
    this.pools.name.set(obj.name, obj.id);
    this.pools.name.set(obj.class, obj.id);
    this.pools.loc.set(obj.loc, obj.id);

    
    if (obj.code) {
      this.pools.code.set(obj.id, { id: obj.id, loc: obj.loc, code: obj.code });
    }
  }

  /**
   * Write to disk all of the changed pools
   * - merging the objects with existing json on disk
   */
  savePoolsToDisk() {
    // save changed pools to disk
    for (const pool of Object.values(this.pools)) {
      pool.saveDirty();
    }
  }

  lookLoc(context) {
    // generate a list of objects in the locs context
    // add to the message (somehow flag only the loc needs to see it)
    let msg = 'Looking around you see ';
    const ids = this.findInLoc(context.loc);
    for (const id of ids) {
      const obj = this.getById(id);
      msg += this.formatObject(obj);
      msg += ', ';
    }
    // TODO.. find last ', ' and replace with 'and '
    msg = msg.replace(/,([^,]*)$/, ' and$1');
    msg += '\n\n';

    console.log('lookLoc', msg);
    this.tickManager.messageManager.add({
      msg: msg,
      context: context
    });
  }

  formatObject(obj) {
    let longName = this.formatQty(obj);

    longName += ' ' + this.formatPlural(obj);
    if (obj.name) {
      longName += ' called ' + obj.name;
    }
    return longName;

  }

  formatQty(obj) {
    obj.qty = !obj.qty ? 1 : obj.qty;
    let qtyText = obj.qty;
    if (obj.qty == 1) {
      qtyText = ['a','e','i','o','u'].includes(obj.class[0]) ? 'an' : 'a';
    } else if (obj.qty == 2) {
      qtyText = 'two';
    } else if (obj.qty == 3) {
      qtyText = 'three';
    } else if (obj.qty == -1) {
      qtyText = 'the';
    } else if (obj.qty < 10) {
      qtyText = obj.qty;
    } else if (obj.qty < 20) {
      qtyText = 'some';
    } else if (obj.qty < 99) {
      qtyText = 'many';
    } else if (obj.qty < 999) {
      qtyText = 'hundreds of';
    } else if (obj.qty < 999999) {
      qtyText = 'thousands of';
    } else if (obj.qty < 999999999) {
      qtyText = 'millions of';
    } else {
      qtyText = 'a mind-boggling quantity of';
    }
    return qtyText;
  }

  formatPlural(obj) {
    let pluralName = '';
    if (obj.qty > 1) {
      var plurals = { 'knife': 'knives', 'sheep': 'sheep', 'loaf': 'loaves', 'mouse': 'mice' };
      var plural = plurals[obj.class];
      pluralName = (plural === undefined) ? obj.class + 's' : plural;
    } else {
      pluralName = obj.class;
    }
    return pluralName;
  }

};
