import fs from "fs";
import path from "path";

import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';

const tickManager = new TickManager(true);
const utils = new Utilities();

const objectManager = tickManager.objectManager;
const pools = objectManager.pools;

const generate = true;
const max = 50;
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
    const obj = { 
      id: objectManager.idManager.new(),
      class : randomName(),
      loc: objectManager.idManager.encodeInt(utils.random(max)), 
      coloue: randomColour() };
    objectManager.addToPools(obj);
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
  objectManager.addToPools(commandSay);

  const commandThink = {
    id: "AC",
    class: "command",
    name: "think",
    loc: "2",
    code: `get $text;\nif $text ne '' then thinkit else ponder;\n##thinkit:\nsay 'think',\"[$actor] . o 0 ( $text )\";\n##ponder:\nsay 'think',\"[$actor] . o 0 ( I keep thinking its Tuesday )\"`
  }
  objectManager.addToPools(commandThink);

  const commandDo = {
    id: "AD",
    class: "command",
    name: "do",
    loc: "2",
    code: `get $text;\nif $text ne '' then doit else fail;\n##doit:\nsay 'action',\"[$actor] $text\";\n##fail:\nvar $text to (claps,dances around the room,sits down);\nrunsub doit;`
  }
  objectManager.addToPools(commandDo);

  const commandCreate = {
    id: "AE",
    class: "command",
    name: "create",
    loc: "2",
    code: `get $text;\nnew $text;\nsay 'create',"[$actor] creates [$target]";\nrelook $loc;`
  }
  objectManager.addToPools(commandCreate);

}

const found = objectManager.findById('1');
console.log('found', found);

found.code = 'THIS IS A TEST 3';
pools.id.set(found.id, found);
pools.code.set(found.id, {id:found.id, loc:found.loc, code: found.code});

objectManager.savePoolsToDisk();

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

function randomColour() {
  const names = ['wheat', 'sage', 'teal', 'tomato', 'dodgerblue']
  return names[utils.random(names.length)];
}

