import fs from "fs";
import path from "path";

import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';

const tickManager = new TickManager(true);
const utils = new Utilities();

const objectManager = tickManager.objectManager;
const pools = objectManager.pools;

const generate = true;
const max = 10;
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
      qty: 1,
      loc: objectManager.idManager.encodeInt(utils.random(max)), 
      colour: randomColour() };
    objectManager.addToPools(obj);
  }
}

if (addCode) {
  initCommands();
}

// manual tinker
const found = objectManager.getById('1');
console.log('found', found);
found.class = 'box';
found.loc = '2';
found.code = `if reacting to think then thinkme;\n##thinkme:\nsay 'say',"[$actor] says Stop it!";`;
`say 'think',"[$actor] . o 0 ( $text )"`
objectManager.addToPools(found);

// save all pools to disk
objectManager.savePoolsToDisk();

const list = objectManager.findByName('pen');
console.log('find all pens by name', list);

const codeText1 = objectManager.getCode(found.id);
console.log('get the code form found', codeText1);

const context = {
  loc: '2',
  actor: 'w'
}

const codeText2 = objectManager.findCommand('say', context);
console.log('find a command ', codeText2);



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

function initCommands() {
  const commands = [{
    class: "command",
    name: "say",
    code: `get $text,$rel,$target in $loc;\nif $target > 0 then sayto else saytext;\n\n##sayto:\nif $niceness > 0 then saynice;\nif $text like \"?\" then asktoit else saytoit;\n##asktoit:\nsay 'ask',\"[$actor] $prefix asks [$target] '$text'\";\n##saytoit:\nsay 'say',\"[$actor] $prefix says '$text' to [$target]\";\n\n##saytext:\nget $text;\nif $niceness > 0 then saynice else saynormal;\nif $text like \"?\" then askit else sayit;\n##askit:\nsay 'ask',\"[$actor] $prefix asks '$text'\";\n##sayit:\nsay 'say',\"[$actor] $prefix says '$text'\";\n\n##saynice:\nvar $prefix to (sweetly,nicely,politely);`,
  },{
    class: "command",
    name: "think",
    code: `get $text;\nif $text ne '' then thinkit else ponder;\n##thinkit:\nsay 'think',\"[$actor] . o 0 ( $text )\";\n##ponder:\nsay 'think',\"[$actor] . o 0 ( I keep thinking its Tuesday )\"`
  },{
    class: "command",
    name: "do",
    code: `get $text;\nif $text ne '' then doit else fail;\n##doit:\nsay 'action',\"[$actor] $text\";\n##fail:\nvar $text to (claps,dances around the room,sits down);\nrunsub doit;`
  },{
    class: "command",
    name: "create",
    code: `get $text;\nnew $text;\nsay 'create',"[$actor] creates [$target]";\nrelook $loc;`
  },{
    class: "command",
    name: "find",
    code: `get $target;\nvar $dest to $target's loc;\nif $target > 0 then itshere else fail;\n##itshere:\nvar $dest to $target's loc;\nsay 'msg',\"[$actor] finds [$target] in [$dest]\";\n##fail;\nsay 'msg',\"[$actor] wants to find '$cmd_text' but has no idea where to start looking\";`
  },{
    class: "command",
    name: "look",
    code: `say 'look',"[$actor] looks around";\nrelook $loc;`
  }
];

  for (const obj of commands) {
    obj.id = objectManager.idManager.new();
    obj.loc = '2';
    objectManager.addToPools(obj);
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

