import fs from "fs";
import path from "path";

import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';
import { IdManager } from './classes/IdManager.js';

const tickManager = new TickManager(true);
const utils = new Utilities();

const objectManager = tickManager.objectManager;
const pools = objectManager.pools;

const generate = false;
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
  const commandSay = {
    id: "AB",
    class: "command",
    name: "say",
    loc: "2",
    code: `get $text,$rel,$target in $loc;\nif $target > 0 then sayto else saytext;\n\n##sayto:\nif $niceness > 0 then saynice;\nif $text like \"?\" then asktoit else saytoit;\n##asktoit:\nsay 'ask',\"[$actor] $prefix asks [$target] '$text'\";\n##saytoit:\nsay 'say',\"[$actor] $prefix says '$text' to [$target]\";\n\n##saytext:\nget $text;\nif $niceness > 0 then saynice else saynormal;\nif $text like \"?\" then askit else sayit;\n##askit:\nsay 'ask',\"[$actor] $prefix asks '$text'\";\n##sayit:\nsay 'say',\"[$actor] $prefix says '$text'\";\n\n##saynice:\nvar $prefix to (sweetly,nicely,politely);`,
  };
  pools.id.set(commandSay.id, commandSay);
  pools.name.set(commandSay.name, commandSay.id);
  pools.loc.set(commandSay.loc, commandSay.id);
  if (commandSay.code) {
    pools.code.set( commandSay.id, { id: commandSay.id, loc: commandSay.loc, code: commandSay.code });    
  }

  const commandThink = {
    id: "AC",
    class: "command",
    name: "think",
    loc: "2",
    code: `get $text;\nif $text ne '' then thinkit else ponder;\n##thinkit:\nsay 'think',\"[$actor] . o 0 ( $text )\";\n##ponder:\nsay 'think',\"[$actor] . o 0 ( I keep thinking its Tuesday )\"`
  }
  pools.id.set(commandThink.id, commandThink);
  pools.name.set(commandThink.name, commandThink.id);
  pools.loc.set(commandThink.loc, commandThink.id);
  if (commandThink.code) {
    pools.code.set( commandThink.id, { id: commandThink.id, loc: commandThink.loc, code: commandThink.code });    
  }

  const commandDo = {
    id: "AD",
    class: "command",
    name: "do",
    loc: "2",
    code: `get $text;\nif $text ne '' then doit else fail;\n##doit:\nsay 'action',\"[$actor] $text\";\n##fail:\nvar $text to (claps,dances around the room,sits down);\nrunsub doit;`
  }
  pools.id.set(commandDo.id, commandDo);
  pools.name.set(commandDo.name, commandDo.id);
  pools.loc.set(commandDo.loc, commandDo.id);
  if (commandDo.code) {
    pools.code.set( commandDo.id, { id: commandDo.id, loc: commandDo.loc, code: commandDo.code });    
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


