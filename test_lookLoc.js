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
  // relies on test objects where several are in obj 2
  const context = {
    loc: '2',
    actor: 'w',
  };

  const data = objectManager.lookLoc(context);
  console.log(data);
  // ---


}