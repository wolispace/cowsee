import fs from "fs";
import path from "path";

import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';
import { IdManager } from './classes/IdManager.js';

const tickManager = new TickManager(true);
const idManager = new IdManager();
const utils = new Utilities();

const objectManager = tickManager.objectManager;
const pools = objectManager.pools;

const generate = false;
const max = 1000;
const cleanup = false;

console.log('---------------------------- START -------------------------------');
const start = Date.now();

if (cleanup) {
  deleteTestFiles();
  idManager.counter = 0;
  idManager.save();
}

if (generate) {
  let counter = 0; 
  while (counter++ < max) {
    const obj = { id: idManager.new(),
      class : randomName(),
      loc: idManager.encodeInt(utils.random(max)), 
      code: '' };
    pools.id.set(obj.id, obj);
    pools.name.set(obj.class, obj.id);
    pools.loc.set(obj.loc, obj.id);

    // pools.code.set('code', { id: obj.id, loc: obj.loc, code: obj.code });    
  }

  for (const pool of Object.values(pools)) {
    //console.log(pool.basename);
    //console.log('-----');
    pool.saveDirty();
  }

}

const found = objectManager.findById('1x');
console.log('found', found);

found.code = 'THIS IS A TEST';
pools.id.set(found.id, found);
pools.id.saveDirty();

const list = objectManager.findByName('pen');
console.log('find by name', list);

const elapsed = Date.now() - start;
console.log(`----------- END ----------- ${elapsed}ms`);

function deleteTestFiles() {
  const dir = "_data";
  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith("index") && file.endsWith(".json")) {
      fs.rmSync(path.join(dir, file), { force: true });
    }
  }
}

function randomName() {
  const names = ['mouse', 'hat', 'card', 'book', 'pen']
  return names[utils.random(names.length)];
}


