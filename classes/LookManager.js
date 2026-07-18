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

  incrementCount() {
    if (this.objCounter++ >= this.maxPerGroup) {
      this.sentenceCounter++;
      this.objCounter = 0;
    }

  }

  look(context) {
    this.context = context;
    this.found = this.objectManager.findInLoc(this.context.loc);
    if (this.found.size < 1) {
      this.sentences.push('Nothing interesting here');
      return returnData();
    }

    this.objs = this.populateObjs();
    this.hosted = this.buildHosted();

    console.log(this.hosted);

    const unhosted = this.hosted['_']['_'];

    this.recursiveLook(unhosted);

    this.buildSentences();

    console.log(this.groups);
    console.log(this.sentences);

    return this.returnData();

  }

  populateObjs() {
    // build a list of all visible objects
    const objs = {};
    for (const id of this.found) {
      const obj = this.objectManager.getById(id);
      if (!obj || obj.pose == 'hidden') continue;
      objs[id] = obj;
      this.objectManager.formatObject(objs[id]);
    }
    return objs;
  }

  buildHosted() {
    const hosted = {};
    for (const [id, obj] of Object.entries(this.objs)) {
      const key = obj.host ?? '_';
      const sub = obj.hosthow ?? '_';
      if (!hosted[key]) hosted[key] = {};
      if (!hosted[key][sub]) hosted[key][sub] = [];
      hosted[key][sub].push(id);
    }
    return hosted;
  }


  /*
  {
  _: { _: [ '1', '3', 'Z', 'w', 'A', 'H' ] },
  A: { on: [ 'B' ] },
  B: { on: [ 'C', 'F', 'G' ], under: [ 'I' ], around: [ 'L' ] },
  C: { on: [ 'D' ] },
  D: { on: [ 'E' ] },
  J: { under: [ 'K' ] }
}
  */

  recursiveLook(ids) {
    for (const id of ids) {
      if (this.seen.has(id)) continue;
      this.groups.set(this.sentenceCounter, id);
      this.seen.add(id);
      this.incrementCount();
      if (!this.hosted[id]) continue;
      for (const [hosthow, hostedIds] of Object.entries(this.hosted[id])) {
        this.recursiveLook(hostedIds);
        this.incrementCount();
      }
    }
  }

  /*
SetMap {
  map: Map(7) {
    0 => Set(3) { '1', '3', 'Z' },
    1 => Set(3) { 'w', 'A', 'B' },
    2 => Set(3) { 'C', 'D', 'E' },
    3 => Set(1) { 'F' },
    4 => Set(2) { 'G', 'I' },
    5 => Set(1) { 'L' },
    6 => Set(1) { 'H' }
  }
}
  */
  buildSentences() {
    this.sentences = [];
    for (const [key, ids] of this.groups.map) {
      let sentence = 'You {also} see ';
      let delim = ' ';
      let objCounter = 1;
      for (const id of ids) {
        delim = (objCounter++ >= ids.size) ? ' and ' : delim;
        sentence += `${delim}{${id}}`;
        delim = ', ';
      }
      sentence = this.utils.sentenceCase(sentence);
      this.sentences.push(sentence);
    }
  }


  returnData() {
    return {
      msg: this.sentences.join('. '),
      loc: this.context.loc,
      objs: this.objs,
      context: this.context
    };
  }
  
};
