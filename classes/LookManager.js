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
    // console.dir(this.hosted, { depth: null, colors: true });
    const unhosted = this.hosted['_'];
    this.recursiveLook(unhosted);
    // console.dir(this.groups, { depth: null, colors: true });
    this.buildSentences();
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
      const pose = obj.pose ?? '_';
      if (!hosted[key]) hosted[key] = {};
      if (!hosted[key][sub]) hosted[key][sub] = {};
      if (!hosted[key][sub][pose]) hosted[key][sub][pose] = [];

      hosted[key][sub][pose].push(id);
    }
    return hosted;
  }


  /*
const new = {
  _: { _: { _: ['1'], flying: ['H'] } },
  A: { on: { _: ['B'] } },
  B: {
    on: { _: ['C', 'F', 'G'] },
    under: { sleeping: ['I'] },
    around: { dancing: [ 'L'] }
  },
  C: { on: { _: [ 'D' ] } },
  D: { on: { _: ['E'] } },
  J: { under: { sleeping: ['K'] } }
}
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
    let sentenceCount = 0;
    let lastHost = '';
    for (const [key, ids] of this.groups.map) {
      const firstId = ids.values().next().value; // read first from a Set
      const obj = this.objs[firstId];
      const host = obj?.host;
      let showHost = 'You also see';
      if (host) {
        if (lastHost == host) {
          showHost = `Also {${obj.id}.hosthow} the {${host}.class} there {${obj.id}.is}`;
        } else {
          showHost = `{${obj.id}.hosthow} the {${host}.class} there {${obj.id}.is}`;
        }
      }
      let sentence = sentenceCount++ < 1 ? 'You see' : showHost;
      let delim = ' ';
      let objCounter = 1;
      for (const id of ids) {
        delim = (ids.size > 1 && objCounter++ >= ids.size) ? ' and ' : delim;

        let descObj = `{${id}.pose} {${id}}`;
        descObj = `{${id}.qtyText} {${id}.pose} {${id}.plural}`;

        sentence += `${delim}${descObj}`;
        delim = ', ';
      }
      this.sentences.push(sentence);
      lastHost = host;
    }
    //console.log(this.sentences);
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
