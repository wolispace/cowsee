import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';

const tickManager = new TickManager(true);
const objectManager = tickManager.objectManager;


console.log('---------------------------- START -------------------------------');
const start = Date.now();

runTests();

let elapsed = Date.now() - start;
let units = 'ms';
if (elapsed > 1000) {
  elapsed = elapsed / 1000;
  units = 's';
}
console.log(`----------- END ----------- ${elapsed}${units}`);

function runTests() {
  const context = {
    loc: '2',
    actor: 'w',
  };

  console.log('=== ORIGINAL DATA - lookLoc0() ===');
  const data1 = objectManager.lookLoc0(context);
  console.log(data1.msg);

  console.log('\n=== ORIGINAL DATA - lookLoc() ===');
  const data2 = objectManager.lookLoc(context);
  console.log(data2.msg);

  console.log('\n=== COMPLEX SCENARIO ===');

  // Let's clear the pools in-memory and register our specific test scenario
  for (const pool of Object.values(objectManager.pools)) {
    pool.clear();
  }

  // Helper to add mock objects to pools
  const addObj = (obj) => {
    obj.loc = '2';
    obj.qty = obj.qty ?? 1;
    objectManager.addToPools(obj);
  };

  // 1. Nested recursion test: rug (A) > table (B) > plate (C) > cheese (D) > fly (E)
  addObj({ id: 'A', class: 'rug' });
  addObj({ id: 'B', class: 'table', host: 'A', hosthow: 'on' });
  addObj({ id: 'C', class: 'plate', host: 'B', hosthow: 'on' });
  addObj({ id: 'D', class: 'cheese', host: 'C', hosthow: 'on' });
  addObj({ id: 'E', class: 'fly', host: 'D', hosthow: 'on' });

  // 2. Multiple children on table (B) to test list grouping and no-inlining
  addObj({ id: 'F', class: 'fork', host: 'B', hosthow: 'on' });
  addObj({ id: 'G', class: 'knife', host: 'B', hosthow: 'on' });

  // 3. Posed objects: bird (H) flying, cat (I) sleeping under B
  addObj({ id: 'H', class: 'bird', pose: 'flying' });
  addObj({ id: 'I', class: 'cat', host: 'B', hosthow: 'under', pose: 'sleeping' });

  // 4. Hidden objects: box (J) hidden, key (K) sleeping under J
  addObj({ id: 'J', class: 'box', host: 'B', hosthow: 'on', pose: 'hidden' });
  addObj({ id: 'K', class: 'key', host: 'J', hosthow: 'under', pose: 'sleeping' });

  // 5. Plural/gender test: mice (L) qty 6 around table (B)
  addObj({ id: 'L', class: 'mouse', qty: 6, host: 'B', hosthow: 'around', pose: 'dancing', gender: 'them' });

  console.log('--- Running lookLoc0() on Complex Scenario ---');
  const res1 = objectManager.lookLoc0(context);
  console.log(res1.msg);

  console.log('\n--- Running lookLoc() on Complex Scenario ---');
  const res2 = objectManager.lookLoc(context);
  console.log(res2.msg);
}