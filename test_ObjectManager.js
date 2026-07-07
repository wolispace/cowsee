import fs from "fs";
import path from "path";

import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';
import { IdManager } from './classes/IdManager.js';

const tickManager = new TickManager(true);
const utils = new Utilities();

const objectManager = tickManager.objectManager;
const pools = objectManager.pools;

const generate = true;
const max = 1000;
const cleanup = generate;
const addCode = true;

console.log('---------------------------- START -------------------------------');
const start = Date.now();

if (cleanup) {
  deleteTestFiles();
  objectManager.idManager.counter = 0;
  objectManager.idManager.save();
}

if (generate) {
  let counter = 0; 
  while (counter++ < max) {
    const obj = { id: objectManager.idManager.new(),
      class : randomName(),
      loc: objectManager.idManager.encodeInt(utils.random(max)), 
      code: 'TEST CODE' };
    pools.id.set(obj.id, obj);
    pools.name.set(obj.class, obj.id);
    pools.loc.set(obj.loc, obj.id);
    if (obj.code) {
      pools.code.set( obj.id, { id: obj.id, loc: obj.loc, code: obj.code });    
    }
  }
  for (const pool of Object.values(pools)) {
    pool.saveDirty();
  }
}

if (addCode) {
  const sayCommand = {
    id: "AB",
    class: "command",
    name: "say",
    loc: "2",
    code: `get $text,$rel,$target in $loc;\nif $target > 0 then sayto else saytext;\n\n##sayto:\nif $niceness > 0 then saynice;\nif $text like \"?\" then asktoit else saytoit;\n##asktoit:\nsay 'ask',\"[$actor] $prefix asks [$target] '$text'\";\n##saytoit:\nsay 'say',\"[$actor] $prefix says '$text' to [$target]\";\n\n##saytext:\nget $text;\nif $niceness > 0 then saynice else saynormal;\nif $text like \"?\" then askit else sayit;\n##askit:\nsay 'ask',\"[$actor] $prefix asks '$text'\";\n##sayit:\nsay 'say',\"[$actor] $prefix says '$text'\";\n\n##saynice:\nvar $prefix to (sweetly,nicely,politely);`,
  }
  pools.id.set(sayCommand.id, sayCommand);
  pools.name.set(sayCommand.name, sayCommand.id);
  pools.loc.set(sayCommand.loc, sayCommand.id);
  if (sayCommand.code) {
    pools.code.set( sayCommand.id, { id: sayCommand.id, loc: sayCommand.loc, code: sayCommand.code });    
  }
}

const found = objectManager.findById('1');
console.log('found', found);

found.code = 'THIS IS A TEST 2';
pools.id.set(found.id, found);
pools.code.set(found.id, {id:found.id, loc:found.loc, code: found.code});
console.log('---- about to save code for obj 1');

// write oneoff changes to disk
pools.id.saveDirty();
pools.name.saveDirty();
pools.loc.saveDirty();
pools.code.saveDirty();

const list = objectManager.findByName('pen');
console.log('find by name', list);

const codeText1 = objectManager.getCode(found.id);
console.log('codeText1', codeText1);

const context = {
  loc: '2',
  actor: 'w'
}

const codeText2 = objectManager.findCommand('say', context);
console.log('codeText', codeText2);



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


