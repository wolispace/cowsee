import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';
import { LookManager } from './classes/LookManager.js';


const tickManager = new TickManager(true);
const objectManager = tickManager.objectManager;
const lookManager = tickManager.lookManager;
const utils = new Utilities();

const addObjects = false;

console.log('---------------------------- START -------------------------------');
const start = Date.now();

if (addObjects) {
  addTestObjects();
}
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
    player: 'w',
  };



  // console.log('--- Running lookLoc() on Complex Scenario 001 ---');
  // const res1 = objectManager.lookLoc(context);
  // console.log(res1.msg);

  console.log('\n--- Running lookManager.look() ---');
  const data = lookManager.look(context);
  const msg = utils.interpolate(data, true);

  //tickManager.messageManager.add(data);
  console.log(msg);
}


// Helper to add mock objects to pools
const addObj = (obj) => {
  obj.loc = '2';
  obj.qty = obj.qty ?? 1;
  objectManager.addToPools(obj);
};

function addTestObjects() {
  // 1. Nested recursion test: rug (A) > table (B) > plate (C) > cheese (D) > fly (E)
  addObj({ id: 'A', class: 'rug', gender: 'it' });
  addObj({ id: 'B', class: 'table', host: 'A', hosthow: 'on', qty: 1, is: 'is', gender: 'it' });
  addObj({ id: 'C', class: 'plate', host: 'B', hosthow: 'on', qty: 1, is: 'is', gender: 'it' });
  addObj({ id: 'D', class: 'cheese', host: 'C', hosthow: 'on', qty: 10, is: 'is', gender: 'it' });
  addObj({ id: 'E', class: 'fly', host: 'D', hosthow: 'on', qty: 1, is: 'is', gender: 'it' });

  // 2. Multiple children on table (B) to test list grouping and no-inlining
  addObj({ id: 'F', class: 'fork', host: 'B', hosthow: 'on', qty: 1, is: 'is', gender: 'it' });
  addObj({ id: 'G', class: 'knife', host: 'B', hosthow: 'on', qty: 1, is: 'is', gender: 'it' });

  // 3. Posed objects: bird (H) flying, cat (I) sleeping under B
  addObj({ id: 'H', class: 'bird', pose: 'flying', qty: 1, is: 'is', gender: 'it' });
  addObj({ id: 'I', class: 'cat', host: 'B', hosthow: 'under', pose: 'sleeping', qty: 1, is: 'is', gender: 'it' });

  // 4. Hidden objects: box (J) hidden, key (K) sleeping under J
  addObj({ id: 'J', class: 'fish', host: 'B', hosthow: 'on', pose: 'hidden', qty: 1, is: 'is', gender: 'it' });
  addObj({ id: 'K', class: 'key', host: 'J', hosthow: 'under', pose: 'sleeping', qty: 1, is: 'is', gender: 'it' });

  // 5. Plural/gender test: mice (L) qty 6 around table (B)
  addObj({ id: 'L', class: 'mouse', qty: 6, host: 'B', hosthow: 'around', pose: 'dancing', gender: 'them', is: 'are' });

  // save all pools to disk
  objectManager.savePoolsToDisk();
}

/*
Current:
You see {H} {H.pose}. 

There are also {1}, {Z} and {3}. 

Looking around you also notice {w} and {A} with {B} {B.hosthow} {A.gender}. 

{C.hosthow} {B} are {C} with {D} {D.hosthow} {C.gender}, {F} and {G}. 

{I.hosthow} {B} there {I.is} {I} {I.pose}. 

There {L.is} {L} {L.pose} {L.hosthow} {B}. 

{E.hosthow} {D} {E.is} {E}.




*/