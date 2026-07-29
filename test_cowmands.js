import { TickManager } from './classes/TickManager.js';

// Create a test tick manager
const tickManager = new TickManager(true);

const commandManager = tickManager.commandManager;

console.log('---------------------------- START -------------------------------');
const start = Date.now();

// ---
const obj = {id: 'A', class:'book', qty: 1, loc: 'B'};
tickManager.objectManager.addToPools(obj);

commandManager.context = {target: 'A', exit: 'C', newloc: 'Z'};

const statement = `update $target to "loc=$newloc, link=$exit, material='_door_', color='lightgreen'";`;

commandManager.executeStatement(statement);

console.log(tickManager.objectManager.getById('A'));

// ---

let elapsed = Date.now() - start;
let units = 'ms';
if (elapsed > 1000) {
  elapsed = elapsed / 1000;
  units = 's'; 
}
console.log(`----------- END ----------- ${elapsed}${units}`);
