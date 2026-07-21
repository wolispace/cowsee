import { SetMap } from './SetMap.js';
import { Utilities } from './Utilities.js';

export class LookManager {
  seen = [];
  found = {};
  objs = {};
  groups = new SetMap();
  seen = new Set();
  sentences = [];
  sentenceCounter = 0;
  objCounter = 0;
  maxPerGroup = 2;

  constructor(tickManager) {
    this.tickManager = tickManager;
    this.objectManager = this.tickManager.objectManager;
    this.utils = new Utilities();
  }

  /**
   * Returns an object for adding to the msg queue with a list of all obj
   * @param {object} context 
   */
  list(context) {
    this.context = context;
    this.found = this.objectManager.findInLoc(this.context.loc);
    if (this.found.size < 1) {
      this.sentences.push('Nothing interesting here');
      return this.returnData();
    }

    this.objs = this.populateObjs();
    let list = '';
    for (const id of this.objs) {
      list += `{${id}}, `;
    }
    this.sentences.push(list);
    return this.returnData();
  }

  /**
   * Returns an object for adding to the msg queue with a paragraph of all obj
   * @param {object} context 
   */
  look(context) {
    this.context = context;
    this.found = this.objectManager.findInLoc(this.context.loc);
    if (this.found.size < 1) {
      this.sentences.push('Nothing interesting here');
      return this.returnData();
    }
    this.objs = this.populateObjs();
    this.hosted = this.buildHosted();
    // console.dir(this.hosted, { depth: null, colors: true });
    const unhosted = this.hosted['_'];
    this.recursiveLook(unhosted);
    // console.dir(this.groups, { depth: null, colors: true });
    this.buildSentences();
    return this.returnData();
  }

  /**
   * Returns a list of all visible objects 
   * @returns {object}
   */
  populateObjs() {
    const objs = {};
    for (const id of this.found) {
      const obj = this.objectManager.getById(id);
      if (!obj || obj.pose == 'hidden') continue;
      objs[id] = obj;
      this.objectManager.formatObject(objs[id]);
    }
    return objs;
  }

  /**
   * Returns an object grouped by hosting, hosthow and pose so sentences can be structued by these
   * @returns {object}
   */
  buildHosted() {
    const hosted = {};
    for (const [id, obj] of Object.entries(this.objs)) {
      const key = obj.host ?? '_';
      const sub = obj.hosthow ?? '_';
      const pose = obj.pose ?? '_';
      if (!hosted[key]) hosted[key] = {};
      if (!hosted[key][sub]) hosted[key][sub] = {};
      if (!hosted[key][sub][pose]) hosted[key][sub][pose] = [];

      hosted[key][sub][pose].push(id);
    }
    return hosted;
  }

  /**
   * Puts all objects into groups for formatting into setences
   * @param {*} hosthows 
   */
  recursiveLook(hosthows) {
    // hosthows is always an object:
    // { on: { _: [...], flying: [...] }, under: {...}, ... }
    for (const [hosthow, poses] of Object.entries(hosthows)) {
      // poses is an object of pose → ids[]
      // { _: ['1'], flying: ['H'] }
      for (const [pose, ids] of Object.entries(poses)) {
        for (const id of ids) {
          if (this.seen.has(id)) continue;
          this.groups.set(this.sentenceCounter, id);
          this.seen.add(id);
          const hosted = this.hosted[id];
          if (!hosted) continue;
          this.sentenceCounter++;
          // hosted[id] is again hosthows
          this.recursiveLook(hosted);
          // this.incrementCount();
        }
        this.sentenceCounter++;
      }
      this.sentenceCounter++;
    }
  }

  /**
   * Format sentences as replaceable params for display 
   */
  buildSentences() {
    this.sentences = [];
    let sentenceCount = 0;
    let lastHost = '';
    for (const [key, ids] of this.groups.map) {
      const firstId = ids.values().next().value; // read first from a Set
      const obj = this.objs[firstId];
      const host = obj?.host;
      let showHost = '</div><div>You also see';
      if (host) {
        if (lastHost == host) {
          showHost = `{${obj.id}.hosthow} the {${host}.class} there {${obj.id}.is}`;
        } else {
          showHost = `{${obj.id}.hosthow} the {${host}.class} there {${obj.id}.is}`;
        }
      }
      let sentence = sentenceCount++ < 1 ? 'You see' : showHost;
      let delim = ' ';
      let objCounter = 1;
      for (const id of ids) {
        const sub = this.objs[id];
        delim = (ids.size > 1 && objCounter++ >= ids.size) ? ' and ' : delim;
        let objName = sub.class == 'player' ? `player called {${id}}` : `{${id}.plural}`;
        let descObj = `{${id}.pose} {${id}}`;
        descObj = `{${id}.qtyText} {${id}.pose} ${objName}`;
        sentence += `${delim}${descObj}`;
        delim = ', ';
      }
      this.sentences.push(sentence);
      lastHost = obj.id;
    }
  }

  /**
   * Returns a data structure sor sening as a message to the front-end
   * @returns {object}
   */
  returnData() {
    return {
      msg: '<div>' + this.sentences.join('. ') + '</div>',
      loc: this.context.loc,
      objs: this.objs,
      context: this.context
    };
  }
};
