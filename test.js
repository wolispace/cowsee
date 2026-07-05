import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';
import { PoolManager } from './classes/PoolManager.js';

const tickManager = new TickManager(true);

const pools = new Map();

for (const key of ['id', 'name', 'code', 'loc']) {
  pools[key] = new PoolManager(tickManager, key);
}

//pools.id.set("AC", { id: "AC", class: "card", loc: "0" });
//pools.id.set("m", { id: "m", class: "mouse", loc: "0" });
//pools.id.saveDirty();
const obj = pools.id.get('m');
console.log(obj);
const obj2 = pools.id.get('AC');
console.log(obj2);
console.log('end');
