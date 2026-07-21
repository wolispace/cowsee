import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';
import { LookManager } from './classes/LookManager.js';


const tickManager = new TickManager(true);
const objectManager = tickManager.objectManager;
const lookManager = tickManager.lookManager;
const utils = new Utilities();

const addObjects = true;

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
  objectManager.save({ id: 'A', loc: '2', qty: 1, class: 'rug' });
  objectManager.save({ id: 'B', loc: '2', qty: 1, class: 'table', host: 'A', hosthow: 'on' });
  objectManager.save({ id: 'C', loc: '2', qty: 1, class: 'plate', host: 'B', hosthow: 'on' });
  objectManager.save({ id: 'D', loc: '2', qty: 3, class: 'cheese', host: 'C', hosthow: 'on' });
  objectManager.save({ id: 'E', loc: '2', qty: 1, class: 'fly', host: 'D', hosthow: 'on' });

  // 2. Multiple children on table (B) to test list grouping and no-inlining
  objectManager.save({ id: 'F', loc: '2', qty: 1, class: 'fork', host: 'B', hosthow: 'on' });
  objectManager.save({ id: 'G', loc: '2', qty: 1, class: 'knife', host: 'B', hosthow: 'on' });

  // 3. Posed objects: bird (H) flying, cat (I) sleeping under B
  objectManager.save({ id: 'H', loc: '2', qty: 1, class: 'bird', pose: 'flying' });
  objectManager.save({ id: 'I', loc: '2', qty: 1, class: 'dog', host: 'B', hosthow: 'under', pose: 'sleeping' });

  // 4. Hidden objects: box (J) hidden, key (K) sleeping under J
  objectManager.save({ id: 'J', loc: '2', qty: 1, class: 'fish', host: 'B', hosthow: 'on', pose: 'hidden' });
  objectManager.save({ id: 'K', loc: '2', qty: 1, class: 'key', host: 'J', hosthow: 'under', pose: 'sleeping' });

  // 5. Plural/gender test: mice (L) qty 6 around table (B)
  objectManager.save({ id: 'L', loc: '2', qty: 6, class: 'mouse', host: 'B', hosthow: 'around', pose: 'dancing'});

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