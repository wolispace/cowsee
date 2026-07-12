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
  reactions = 0;
  maxReactions = 5;

  constructor(tickManager) {
    this.tickManager = tickManager;
    for (const key of ['id', 'name', 'code', 'loc', 'trigger', 'info']) {
      this.pools[key] = new PoolManager(tickManager, key);
    }
  }

  /**
   * Returns the whole object from a chunked file
   * @param {string} id 
   * @returns {object}
   */
  getById(id) {
    const set = this.pools.id.get(id);
    if (!set || set.size === 0) return undefined;
    return set.values().next().value;
  };

  /**
   * Returns an array of IDs with the required word eg: "cat" returns ["AB", "Ax" ...]
   * @param {string} key 
   * @returns {set} of IDs with this name
   */
  findByName(key) {
    return this.pools.name.get(key);
  };

  /**
   * Returns an array of object IDs in the location
   * @param {string} key 
   * @returns {set}
   */
  findInLoc(key) {
    //  so we load fresh merged data
    if (this.pools.loc.isDirty()) {
      this.pools.loc.saveDirty();
      this.pools.loc.clear();
    }
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
    const set = this.pools.code.get(id);
    if (!set || set.size === 0) return '';
    const codeObj = set.values().next().value;
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
    // console.log(`find ids for ${firstword} `, ids);

    if (!ids || ids.size < 1) return '';
    if (ids.size === 1) {
      const [id] = ids;
      return this.getCode(id);
    }
    for (const id of ids) {
      const obj = this.getById(id);
      if (!obj) continue;
      if (obj.loc === context.actor) {
        return this.getCode(id);
      }
      if (obj.loc === context.loc) {
        return this.getCode(id);
      }
      if (obj.class === 'command') {
        return this.getCode(id);
      }
    }
    return '';
  };


  /**
   * Runs code from a triggered object
   * @param {object} context 
   * @returns 
   */
  findTrigger(context) {
    if (!context) return;
    const found = this.pools.trigger.get(context.trigger);
    if (!found || found.size < 1) return;
    // loop through these to see if they are in the context.loc
    const inLoc = this.pools.loc.get(context.loc);
    if (!inLoc || inLoc.size < 1) return;
    const triggerable = new Set(
      [...found].filter(obj => inLoc.has(obj.id))
    );

    if (triggerable.size < 1) return;

    // dont do infinate reactions
    if (this.reactions++ >= this.maxReactions) return;

    // console.log('triggers found', triggerable, JSON.stringify([...found]));
    for (const triggered of triggerable) {
      const obj = this.getById(triggered.id);
      if (!obj) continue;
      // prepare the context for this execution
      context.actor = obj.id;
      // context.actor = `the ${obj.class}`;
      this.tickManager.commandManager.runCodeFrom(obj.code, triggered.block, context);
    }
  }

  /**
   * Add the object to all of the pools
   * @param {obj} obj 
   */
  addToPools(obj) {
    this.formatObject(obj);
    this.pools.id.set(obj.id, obj);
    this.pools.name.set(obj.name, obj.id);
    this.pools.name.set(obj.class, obj.id);
    this.pools.loc.set(obj.loc, obj.id);
    this.pools.info.set(obj.id, obj.info);

    if (obj.code) {
      this.pools.code.set(obj.id, { id: obj.id, loc: obj.loc, code: obj.code });
      this.addTriggers(obj);
    }
  }

  /**
   * Adds a trigger word if this code is triggred in some way
   * @param {object} obj 
   * @returns 
   */
  addTriggers(obj) {
    // combined
    const pattern = /\bif\s+(reacting\s+to|target\s+of)\s+(\w+)\s+then\s+(\w+);/i;
    const match = obj.code.match(pattern);
    if (!match) return;
    const type = match[1].includes('target') ? 'target' : 'reacts';
    const trigger = match[2];
    const block = match[3];
    this.pools.trigger.set(trigger, { id: obj.id, block: block });
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

  /**
   * Generate a msg of all obj ids in the loc and adds it to the msg queue
   * @param {object} context 
   */
  lookLoc(context) {
    let msg = 'Looking around you see ';
    const ids = this.findInLoc(context.loc);
    let delim = '';
    const objs = {};
    for (const id of ids) {
      const obj = this.getById(id);
      this.formatObject(obj);
      objs[id] = obj;
      msg += `${delim}{${id}}`;
      delim = ', ';
    }
    // tidy up end of sentence
    msg = msg.replace(/,([^,]*)$/, ' and$1');
    msg += '.';

    this.tickManager.messageManager.add({
      msg: msg,
      loc: context.loc,
      objs: objs,
      context: context
    });
  }

  /**
   * Add all referenced objects into this context from "{Ax} says hi to {b2}"
   * @param {object} data 
   * @returns nothing, updates obj
   */
  prepContext(data) {
    data.objs = data.objs ?? {};
    // Phase 1: Process [$var] (bracketed = linkable objects)
    data.msg = data.msg.replace(/\[\$(\w+)\]/g, (_, varName) => {
      const value = data.context[varName] ?? '';
      const obj = this.getById(value);
      if (obj) {
        data.objs[value] = { longname: obj.longname, color: obj.colour || obj.color, link: true };
        return `{${value}}`;
      }
      return value; // fallback: plain text substitution
    });

    // Phase 2: Process $var (non-bracketed = styled but not linked)
    data.msg = data.msg.replace(/\$(\w+)/g, (_, varName) => {
      const value = data.context[varName] ?? '';
      const obj = this.getById(value);
      if (obj) {
        if (!data.objs[value]) {
          data.objs[value] = { longname: obj.longname, color: obj.colour || obj.color };
        }
        return `{${value}}`;
      }
      return value; // plain text: substitute literally
    });
  }

  /**
   * Adds formatted/processed versions of values within the object. Saved to disk so we dont need to reprocess again.
   * Each time an object is added to the pools its re formatted.
   * @param {obj} obj 
   * @returns nothing, the obj is updated
   */
  formatObject(obj) {
    this.formatQty(obj);
    this.formatPlural(obj);
    obj.longname = `${obj.qtyText} ${obj.plural}`;
    if (obj.name) {
      obj.longname += ' called ' + obj.name;
    }
  }

  /**
   * Formats the qty as a string eg 30 = many
   * @param {obj} obj 
   * @returns nothing, updates obj
   */
  formatQty(obj) {
    obj.qty = !obj.qty ? 1 : obj.qty;
    obj.qtyText = obj.qty;
    if (obj.qty == 1) {
      obj.qtyText = ['a', 'e', 'i', 'o', 'u'].includes(obj.class[0]) ? 'an' : 'a';
    } else if (obj.qty == 2) {
      obj.qtyText = 'two';
    } else if (obj.qty == 3) {
      obj.qtyText = 'three';
    } else if (obj.qty == -1) {
      obj.qtyText = 'the';
    } else if (obj.qty < 10) {
      obj.qtyText = obj.qty;
    } else if (obj.qty < 20) {
      obj.qtyText = 'some';
    } else if (obj.qty < 99) {
      obj.qtyText = 'many';
    } else if (obj.qty < 999) {
      obj.qtyText = 'hundreds of';
    } else if (obj.qty < 999999) {
      obj.qtyText = 'thousands of';
    } else if (obj.qty < 999999999) {
      obj.qtyText = 'millions of';
    } else {
      obj.qtyText = 'a mind-boggling quantity of';
    }
  }

  /**
   * Formats the plural version of this object
   * @param {object} obj 
   * @returns nothing, updates obj
   */
  formatPlural(obj) {
    obj.plural = '';
    if (obj.qty > 1) {
      const plurals = { 'knife': 'knives', 'sheep': 'sheep', 'loaf': 'loaves', 'mouse': 'mice' };
      const plural = plurals[obj.class];
      obj.plural = (plural === undefined) ? obj.class + 's' : plural;
    } else {
      obj.plural = obj.class;
    }
  }

};
