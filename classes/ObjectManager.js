import fs from 'fs';
import path from 'path';
import { IdManager } from './IdManager.js';
import { PoolManager } from './PoolManager.js';
import { SetMap } from './SetMap.js';

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
    const name = key.replace(/^(?:the|an|a)\b/i, '').trim();
    return this.pools.name.get(name);
  };

  /**
   * Find the first named object in the location
   * @param {string} name 
   * @param {string} loc 
   * @returns {string} the ID of the found object
   */
  findByNameInLoc(name, loc) {
    const inName = this.findByName(name);
    const inLoc = this.findInLoc(loc);

    for (const key of inLoc) {
      if (inName.has(key)) {
        return key;
      }
    }
  }

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

    for (const triggered of triggerable) {
      const obj = this.getById(triggered.id);
      if (!obj) continue;
      // prepare the context for this execution
      context.actor = obj.id;
      obj.code = this.getCode(obj.id);
      this.tickManager.commandManager.runCodeFrom(obj.code, triggered.block, context);
    }
  }

  /**
   * Saves changes (back to the pool which eventually end up on disk)
   * @param {object} obj 
   */
  save(obj) {
    this.addToPools(obj);
  }

  /**
   * Add the object to all of the pools
   * @param {obj} obj 
   */
  addToPools(obj) {
    if (obj.code) {
      this.pools.code.set(obj.id, { id: obj.id, loc: obj.loc, code: obj.code }, null, true);
      this.addTriggers(obj);
      delete obj.code; // const { code, ...rest } = obj; // delete obj.code using destructuring
    }
    if (obj.info) {
      this.pools.info.set(obj.id, obj.info, null, true);
      delete obj.info; // delete const { info, ...rest } = obj; // delete obj.info using destructuring
    }
    this.formatObject(obj);
    this.pools.id.set(obj.id, obj, null, true);
    this.pools.name.set(obj.name, obj.id);
    this.pools.name.set(obj.class, obj.id);
    this.pools.loc.set(obj.loc, obj.id);

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
    const ids = this.findInLoc(context.loc);
    let delim = '';
    this.hosted = new SetMap();
    this.unhosted = new SetMap();
    this.objs = {};
    // find all hosted 
    for (const id of ids) {
      const obj = this.getById(id);
      this.objs[id] = obj;
      this.formatObject(this.objs[id]);
      if (obj.host) {
        this.hosted.add(obj.host, obj.id);
      } else {
        this.unhosted.add('none', obj.id);
      }
    }
    const msg = this.describeScene();

    this.tickManager.messageManager.add({
      msg: msg,
      loc: context.loc,
      objs: this.objs,
      context: context
    });
  }

  /**
   * Describe a location usin ids so the client assemles
   * "You see {Ax} and {Ac} with {je1} beside it and {gl} behind it. Under {Je1} is {dd2}."
   * @returns {string}
   */
  describeScene() {
    const roots = this.unhosted.get('none');
    const sentences = [];

    for (const id of roots) {
      const desc = this.describeObject(id);

      // Turn the recursive description into a readable sentence
      // e.g. "table with chairs around it" → "You see a table with chairs around it."
      sentences.push(`You see ${desc}.`);
    }

    return sentences.join(' ');
  }

  /**
   * Returns a sentence combining an object and what it hosts (first draft not ideal)
   * @param {string} id 
   * @returns {string}
   */
  describeObject(id) {
    const obj = this.objs[id];
    const name = obj.longname || `{${id}}`;

    // If nothing is hosted on this object, just return its name.
    if (!this.hosted.has(id) || this.hosted.get(id).size === 0) {
      return `{${id}}`;
    }

    const children = [...this.hosted.get(id)];

    // Group children by how they are hosted
    const byHow = {};
    for (const child of children) {
      const how = this.objs[child].hosthow;
      if (!byHow[how]) byHow[how] = [];
      byHow[how].push(child);
    }

    // Build clauses like:
    // "with some chairs around it"
    // "with a plate on it"
    const clauses = Object.entries(byHow).map(([how, ids]) => {
      const parts = ids.map(subId => this.describeObject(subId));
      const joined = parts.join(' and ');
      return `${joined} ${how} it`;
    });

    return `{${id}} with ${clauses.join(', ')}`;
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
