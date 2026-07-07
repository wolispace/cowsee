import fs from "fs";
import path from "path";

import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';
import { PoolManager } from './classes/PoolManager.js';

const tickManager = new TickManager(true);

const pools = new Map();

for (const key of ['id', 'name', 'code', 'loc']) {
  const type = key == 'id' ? 'map' : 'set';
  pools[key] = new PoolManager(tickManager, key, type);
}

deleteTestFiles();

// let obj = {id:"m1", class:"mouse", loc: "0" };
// pools.id.set(obj.id, obj);
// pools.name.set(obj.class, obj.id);
// pools.loc.set(obj.loc, obj.id);

// obj = {id:"ma", class:"mat", loc: "0" };
// pools.id.set(obj.id, obj);
// pools.name.set(obj.class, obj.id);
// pools.loc.set(obj.loc, obj.id);

// obj = {id:"m2", class:"mouse", loc: "z" };
// pools.id.set(obj.id, obj);
// pools.name.set(obj.class, obj.id);
// pools.loc.set(obj.loc, obj.id);

// obj = {id:"c1", class:"cat", loc: "0" };
// pools.id.set(obj.id, obj);
// pools.name.set(obj.class, obj.id);
// pools.loc.set(obj.loc, obj.id);

// pools.id.saveDirty();
// pools.name.saveDirty();
// pools.loc.saveDirty();

const found = pools.id.get('m1');
console.log(found);
const names = pools.name.get('mouse');
console.log(names);
console.log('-- end --');

function deleteTestFiles() {
  const dir = "_data";
  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith("index") && file.endsWith(".json")) {
      fs.rmSync(path.join(dir, file), { force: true });
    }
  }
}