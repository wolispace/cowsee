import fs from 'fs';
import path from 'path';

import { TickManager } from './classes/TickManager.js';
import { PoolManager } from './classes/PoolManager.js';

const tickManager = new TickManager(true);
const poolStrings = new PoolManager(tickManager, 'teststrs');
const poolObjs = new PoolManager(tickManager, 'testobjs');

// Helper to clean up test files
function cleanup() {
  const dir = "_data";
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (file.startsWith("index_teststrs") || file.startsWith("index_testobjs")) {
        fs.rmSync(path.join(dir, file), { force: true });
      }
    }
  }
}

cleanup();

console.log('---------------------------- START -------------------------------');

console.log('\n=== Testing Strings ===');
poolStrings.set('loc1', 'itemA');
poolStrings.set('loc1', 'itemB');
console.log('poolStrings loc1 in memory:', Array.from(poolStrings.get('loc1')));

poolStrings.saveDirty();

// Add another one to loc1
poolStrings.set('loc1', 'itemC');
poolStrings.saveDirty();

const diskStrings = tickManager.fileManager.loadJson(poolStrings.shardName('loc1'));
console.log('poolStrings loc1 on disk:', diskStrings['loc1']);

console.log('\n=== Testing Objects ===');
const obj1 = { id: 'id1', class: 'cat', color: 'red' };
poolObjs.set('id1', obj1);
console.log('poolObjs id1 in memory (first set):', Array.from(poolObjs.get('id1')));

poolObjs.saveDirty();

// Update object and save again
const obj1_mod = { id: 'id1', class: 'cat', color: 'blue' };
poolObjs.set('id1', obj1_mod);
console.log('poolObjs id1 in memory (second set):', Array.from(poolObjs.get('id1')));

poolObjs.saveDirty();

const diskObjs = tickManager.fileManager.loadJson(poolObjs.shardName('id1'));
console.log('poolObjs id1 on disk:', diskObjs['id1']);

console.log('\n=== Testing Empty Pool Load ===');
// Clear the in-memory pool so it simulates a fresh start
poolObjs.clear();
console.log('poolObjs id1 in memory after clear:', Array.from(poolObjs.get('id1')));

console.log('\n---------------------------- END -------------------------------');
cleanup();
