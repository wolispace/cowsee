import fs from "fs";
import path from "path";

import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';

const tickManager = new TickManager(true);
const utils = new Utilities();

const objectManager = tickManager.objectManager;
const commandManager = tickManager.commandManager;
const pools = objectManager.pools;

const generate = true;
const max =5;
const cleanup = generate;
const addCode = generate;

console.log('---------------------------- START -------------------------------');
const start = Date.now();

const context = {
  loc: '2',
  actor: 'w',
  rel: 'on', 
}

const data = objectManager.lookLoc(context);
console.log(data);
// ---

let elapsed = Date.now() - start;
let units = 'ms';
if (elapsed > 1000) {
  elapsed = elapsed / 1000;
  units = 's'; 
}
console.log(`----------- END ----------- ${elapsed}${units}`);
