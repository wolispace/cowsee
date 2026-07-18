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
  lookLoc0(context) {
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

    const data = {
      msg: this.describeScene(),
      loc: context.loc,
      objs: this.objs,
      context: context
    };

    this.tickManager.messageManager.add(data);

    return data;
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

  /**
   * New lookLoc2 method that structures descriptions dynamically and recursively
   * with limits on sentence group size and rotating templates.
   * @param {object} context 
   * @returns {object}
   */
  lookLoc(context) {
    const data = this.tickManager.lookManager.look(context);
    // messageManager.add(data);
    return data;
  }

  lookLoc3(context) {
    const ids = this.findInLoc(context.loc);
    const objs = {};
    for (const id of ids) {
      const originalObj = this.getById(id);
      if (originalObj) {
        const obj = { ...originalObj };
        objs[id] = obj;
        this.formatObject(objs[id]);
      }
    }

    // Determine hidden status recursively (if an object or its host/ancestor is hidden, it's hidden)
    const isHidden = (id) => {
      const obj = objs[id];
      if (!obj) return true;
      if (obj.pose && obj.pose.trim() === 'hidden') return true;
      if (obj.host) {
        return isHidden(obj.host);
      }
      return false;
    };

    const activeIds = [];
    const activeObjs = {};
    for (const id of ids) {
      if (!isHidden(id)) {
        activeIds.push(id);
        activeObjs[id] = objs[id];
      }
    }

    const unhosted = [];
    const hostedGroups = new Map(); // hostId -> Map(hosthow -> Array of childId)

    for (const id of activeIds) {
      const obj = activeObjs[id];
      if (!obj.host || !activeObjs[obj.host]) {
        unhosted.push(id);
      } else {
        const hostId = obj.host;
        const hosthow = (obj.hosthow || 'on').trim();
        if (!hostedGroups.has(hostId)) {
          hostedGroups.set(hostId, new Map());
        }
        const hosthowMap = hostedGroups.get(hostId);
        if (!hosthowMap.has(hosthow)) {
          hosthowMap.set(hosthow, []);
        }
        hosthowMap.get(hosthow).push(id);
      }
    }

    const seenObjects = new Set();
    const queue = [];

    const describeObject2 = (objId, allowWith) => {
      seenObjects.add(objId);
      const obj = activeObjs[objId];
      if (!obj) return `{${objId}}`;

      let desc = `{${objId}}`;

      if (hostedGroups.has(objId) && allowWith) {
        const hosthowMap = hostedGroups.get(objId);
        if (hosthowMap.size === 1) {
          const [hosthow, children] = hosthowMap.entries().next().value;
          if (children.length === 1) {
            const childId = children[0];
            if (!seenObjects.has(childId)) {
              const childObj = activeObjs[childId];
              const childPose = childObj.pose ? childObj.pose.trim() : '';
              if (hostedGroups.has(childId) && !queue.includes(childId)) {
                queue.push(childId);
              }
              const childDesc = describeObject2(childId, false);
              const poseStr = childPose ? ` {${childId}.pose}` : '';
              desc += ` with ${childDesc}${poseStr} {${childId}.hosthow} {${objId}.gender}`;
            }
          }
        }
      }

      if (hostedGroups.has(objId) && !queue.includes(objId)) {
        queue.push(objId);
      }

      return desc;
    };

    const sentences = [];
    let sentenceIndex = 0;
    let lastHost = null;
    let lastHosthow = null;

    const capitalizeFirst = (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // Process unhosted
    const posedUnhosted = [];
    const unposedUnhosted = [];
    for (const id of unhosted) {
      const obj = activeObjs[id];
      const pose = obj.pose ? obj.pose.trim() : '';
      if (pose) {
        posedUnhosted.push(id);
      } else {
        unposedUnhosted.push(id);
      }
    }

    for (const id of posedUnhosted) {
      if (seenObjects.has(id)) continue;
      const obj = activeObjs[id];
      const pose = obj.pose ? obj.pose.trim() : '';
      const also = (lastHost === 'unhosted' && lastHosthow === null);
      const template = UNHOSTED_TEMPLATES[sentenceIndex % UNHOSTED_TEMPLATES.length];
      sentenceIndex++;

      const objDesc = describeObject2(id, true);
      const poseStr = pose ? ` {${id}.pose}` : '';
      const objsText = `${objDesc}${poseStr}`;
      const rendered = template.render({
        objs: objsText,
        also: also,
        is_are: `{${id}.is}`
      });

      sentences.push(capitalizeFirst(rendered));
      lastHost = 'unhosted';
      lastHosthow = null;
    }

    const maxItems = 3;
    for (let i = 0; i < unposedUnhosted.length; i += maxItems) {
      const chunk = unposedUnhosted.slice(i, i + maxItems).filter(id => !seenObjects.has(id));
      if (chunk.length === 0) continue;

      const also = (lastHost === 'unhosted' && lastHosthow === null);
      let chunkPlural = chunk.length > 1;
      for (const id of chunk) {
        const obj = activeObjs[id];
        if (obj.qty > 1 || obj.is === 'are') {
          chunkPlural = true;
        }
      }
      const firstId = chunk[0];
      const is_are = chunkPlural ? 'are' : `{${firstId}.is}`;

      const template = UNHOSTED_TEMPLATES[sentenceIndex % UNHOSTED_TEMPLATES.length];
      sentenceIndex++;

      const formattedParts = chunk.map(id => describeObject2(id, true));
      const objsText = formatObjectList2(formattedParts);

      const rendered = template.render({
        objs: objsText,
        also: also,
        is_are: is_are
      });

      sentences.push(capitalizeFirst(rendered));
      lastHost = 'unhosted';
      lastHosthow = null;
    }

    // Process queue
    while (queue.length > 0) {
      const hostId = queue.shift();
      const hostObj = activeObjs[hostId];
      if (!hostObj) continue;

      if (hostedGroups.has(hostId)) {
        const hosthowMap = hostedGroups.get(hostId);
        for (const [hosthow, children] of hosthowMap.entries()) {
          const unseenChildren = children.filter(id => !seenObjects.has(id));
          if (unseenChildren.length === 0) continue;

          const posedChildren = [];
          const unposedChildren = [];
          for (const id of unseenChildren) {
            const childObj = activeObjs[id];
            const pose = childObj.pose ? childObj.pose.trim() : '';
            if (pose) {
              posedChildren.push(id);
            } else {
              unposedChildren.push(id);
            }
          }

          for (const id of posedChildren) {
            if (seenObjects.has(id)) continue;
            const childObj = activeObjs[id];
            const pose = childObj.pose ? childObj.pose.trim() : '';

            const hostSeen = seenObjects.has(hostId);
            const availableTemplates = HOSTED_TEMPLATES.filter(t => !hostSeen || !t.usesWith);
            const template = availableTemplates[sentenceIndex % availableTemplates.length];
            sentenceIndex++;

            const also = (lastHost === hostId && lastHosthow === hosthow);
            const objIs = `{${id}.is}`;

            const childDesc = describeObject2(id, !template.usesWith);

            const rendered = template.render({
              host: `{${hostId}}`,
              hostId: hostId,
              hosthowId: id,
              obj: childDesc,
              objIs: objIs,
              pose: pose,
              poseId: id,
              also: also
            });

            sentences.push(capitalizeFirst(rendered));
            lastHost = hostId;
            lastHosthow = hosthow;
          }

          for (let i = 0; i < unposedChildren.length; i += maxItems) {
            const chunk = unposedChildren.slice(i, i + maxItems).filter(id => !seenObjects.has(id));
            if (chunk.length === 0) continue;

            const hostSeen = seenObjects.has(hostId);
            const availableTemplates = HOSTED_TEMPLATES.filter(t => !hostSeen || !t.usesWith);
            const template = availableTemplates[sentenceIndex % availableTemplates.length];
            sentenceIndex++;

            const also = (lastHost === hostId && lastHosthow === hosthow);
            let chunkPlural = chunk.length > 1;
            for (const id of chunk) {
              const childObj = activeObjs[id];
              if (childObj.qty > 1 || childObj.is === 'are') {
                chunkPlural = true;
              }
            }
            const firstId = chunk[0];
            const objIs = chunkPlural ? 'are' : `{${firstId}.is}`;

            const formattedParts = chunk.map(id => describeObject2(id, !template.usesWith));
            const objText = formatObjectList2(formattedParts);

            const rendered = template.render({
              host: `{${hostId}}`,
              hostId: hostId,
              hosthowId: firstId,
              obj: objText,
              objIs: objIs,
              pose: '',
              poseId: '',
              also: also
            });

            sentences.push(capitalizeFirst(rendered));
            lastHost = hostId;
            lastHosthow = hosthow;
          }
        }
      }
    }

    const data = {
      msg: sentences.join(' '),
      loc: context.loc,
      objs: activeObjs,
      context: context
    };

    this.tickManager.messageManager.add(data);

    return data;
  }

};

const UNHOSTED_TEMPLATES = [
  {
    name: 'see',
    render: (ctx) => {
      const alsoStr = ctx.also ? ' also' : '';
      return `You${alsoStr} see ${ctx.objs}.`;
    }
  },
  {
    name: 'there-is',
    render: (ctx) => {
      const alsoStr = ctx.also ? ' also' : '';
      return `There ${ctx.is_are}${alsoStr} ${ctx.objs}.`;
    }
  },
  {
    name: 'notice',
    render: (ctx) => {
      const alsoStr = ctx.also ? ' also' : '';
      return `Looking around you${alsoStr} notice ${ctx.objs}.`;
    }
  }
];

const HOSTED_TEMPLATES = [
  {
    name: 'host-first-see',
    usesWith: true,
    render: (ctx) => {
      const alsoStr = ctx.also ? ' also' : '';
      const poseStr = ctx.pose ? ` {${ctx.poseId}.pose}` : '';
      return `You${alsoStr} see ${ctx.host} with ${ctx.obj}${poseStr} {${ctx.hosthowId}.hosthow} {${ctx.hostId}.gender}.`;
    }
  },
  {
    name: 'host-first-there',
    usesWith: true,
    render: (ctx) => {
      const alsoStr = ctx.also ? ' also' : '';
      const poseStr = ctx.pose ? ` {${ctx.poseId}.pose}` : '';
      return `There {${ctx.hostId}.is}${alsoStr} ${ctx.host} with ${ctx.obj}${poseStr} {${ctx.hosthowId}.hosthow} {${ctx.hostId}.gender}.`;
    }
  },
  {
    name: 'obj-first',
    usesWith: false,
    render: (ctx) => {
      const parts = [];
      if (ctx.also) {
        parts.push('also');
      }
      if (ctx.pose) {
        parts.push(`{${ctx.poseId}.pose}`);
      }
      parts.push(`{${ctx.hosthowId}.hosthow}`);
      parts.push(ctx.host);
      parts.push(ctx.objIs);
      parts.push(ctx.obj);
      return parts.join(' ') + '.';
    }
  },
  {
    name: 'positional-there',
    usesWith: false,
    render: (ctx) => {
      const alsoStr = ctx.also ? 'also ' : '';
      const poseStr = ctx.pose ? ` {${ctx.poseId}.pose}` : '';
      return `${alsoStr}{${ctx.hosthowId}.hosthow} ${ctx.host} there ${ctx.objIs} ${ctx.obj}${poseStr}.`;
    }
  },
  {
    name: 'positional-obj-first',
    usesWith: false,
    render: (ctx) => {
      const alsoStr = ctx.also ? ' also' : '';
      const poseStr = ctx.pose ? ` {${ctx.poseId}.pose}` : '';
      return `There ${ctx.objIs}${alsoStr} ${ctx.obj}${poseStr} {${ctx.hosthowId}.hosthow} ${ctx.host}.`;
    }
  }
];

function formatObjectList2(ids) {
  if (!ids || ids.length === 0) return '';
  if (ids.length === 1) return ids[0];
  if (ids.length === 2) return `${ids[0]} and ${ids[1]}`;
  return `${ids.slice(0, -1).join(', ')} and ${ids[ids.length - 1]}`;
}
