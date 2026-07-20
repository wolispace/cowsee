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
const max = 10; // so we dont stomp over the commands with test records
const cleanup = generate;
const addCode = generate;

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
      colour: randomColour() 
    };
    obj.info = `It's a pretty ordinary ${obj.class}`;
    objectManager.addToPools(obj);
    if (counter % 100 === 0) {
      process.stdout.write(":");
    }
  }
}

if (addCode) {
  initCommands();
}

// manual tinker
let found = objectManager.getById('1');
console.log('found', found);
found.class = 'box';
found.loc = '2';
found.colour = 'pink',
found.code = `if reacting to think then thinkme;\n##thinkme:\nsay 'say',"[$actor] says 'What do you mean?'";`;
objectManager.addToPools(found);

found = objectManager.getById('3');
console.log('found', found);
found.class = 'cat';
found.loc = '2';
found.colour = 'seagreen',
found.code = `if reacting to say then thinkme;\n##thinkme:\nsay 'think',"[$actor] thinks .oO( $cmd_text )";`;
objectManager.addToPools(found);

// add the wolis player id 'w'
const player = {
  id: 'w',
  class: 'player',
  name: 'wolis',
  loc: '2',
  colour: 'goldenrod'
}
objectManager.addToPools(player);

// save all pools to disk
objectManager.savePoolsToDisk();

const list = objectManager.findByName('pen');
console.log('find all pens by name', list);

const codeText1 = objectManager.getCode(found.id);
console.log('get the code form found', codeText1);

const testData = objectManager.lookLoc(commandManager.context);
console.log(testData);

commandManager.context = {
  loc: '2',
  actor: 'w',
  rel: 'on', 
}

let variable = `"$rel"`;
let result = commandManager.resolveValue(variable);
console.log(`::: ${variable} = '${result}'`);

const codeText2 = objectManager.findCommand('say', commandManager.context);
console.log('find a command ', codeText2);

const foundByNameInLoc = objectManager.findByNameInLoc('the box', '2');
console.log({foundByNameInLoc});

found = objectManager.getById('3');
console.log('found again', found);
found.info = 'This is a brilliant cat';
found.pocket = '6',
found.colour = 'tomato',
found.code = `if reacting to say then thinkme;\n##thinkme:\nsay 'think',"[$actor] thinks .oO( $cmd_text )";`;
`say 'think',"[$actor] .oO( $text )"`
objectManager.addToPools(found);

objectManager.savePoolsToDisk();

// ---

let elapsed = Date.now() - start;
let units = 'ms';
if (elapsed > 1000) {
  elapsed = elapsed / 1000;
  units = 's'; 
}
console.log(`----------- END ----------- ${elapsed}${units}`);

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
    name: "say",
    code: `get $text,$rel,$target in $loc;\nif $target > 0 then sayto else saytext;\n\n##sayto:\nif $niceness > 0 then saynice;\nif $text like \"?\" then asktoit else saytoit;\n##asktoit:\nsay 'ask',\"[$actor] $prefix asks [$target] '$text'\";\n##saytoit:\nsay 'say',\"[$actor] $prefix says '$text' to [$target]\";\n\n##saytext:\nget $text;\nif $niceness > 0 then saynice else saynormal;\nif $text like \"?\" then askit else sayit;\n##askit:\nsay 'ask',\"[$actor] $prefix asks '$text'\";\n##sayit:\nsay 'say',\"[$actor] $prefix says '$text'\";\n\n##saynice:\nvar $prefix to (sweetly,nicely,politely);`,
  },{
    name: "think",
    code: `get $text;\nif $text ne '' then thinkit else ponder;\n##thinkit:\nsay 'think',\"[$actor] .oO( $text )\";\n##ponder:\nsay 'think',\"[$actor] .o0( I keep thinking its Tuesday )\"`
  },{
    name: "do",
    code: `get $text;\nif $text ne '' then doit else fail;\n##doit:\nsay 'action',\"[$actor] $text\";\n##fail:\nvar $text to (claps,dances around the room,sits down);\nrunsub doit;`
  },{
    name: "create",
    code: `get $text;\nnew $text;\nsay 'create',"[$actor] creates [$target]";\nrelook $loc;`
  },{
    name: "find",
    code: `get $target;\nvar $dest to $target's loc;\nif $target > 0 then itshere else fail;\n##itshere:\nvar $dest to $target's loc;\nsay 'msg',\"[$actor] finds [$target] in [$dest]\";\n##fail;\nsay 'msg',\"[$actor] wants to find '$cmd_text' but has no idea where to start looking\";`
  },{
    name: "look",
    code: `say 'look',"[$actor] looks around";\nrelook $loc;`
  },{
    name: "put",
    code: `get $target,$rel,$second in $loc,$loc;\nset $target's hosthow to \"$rel\";\nset $target's host to $second;\nset $target's hosthow to \"$rel\";\nset $target's pose to '';\nsay 'put',\"[$actor] put [$target] $rel [$second]\";\nlook $loc;`
  },{
    name: "push",
    code: `get $target in $loc;\nclear $target,all;\nsay 'push',\"[$actor] pushes [$target]\";\nrelook $loc;`
  },{
    name: "pose",
    code: `get $target,\"as\",$text,non-greedy in $loc;\nset $target's pose to $text;\nsay 'pose',\"[$actor] poses [$target] as $text\";`
  }
];

  for (const obj of commands) {
    obj.id = objectManager.idManager.new();
    obj.loc = '3';
    obj.class = 'command',
    obj.color = randomColour(),
    objectManager.addToPools(obj);
  }
}

function randomName() {
  const names = ['mouse', 'hat', 'card', 'book', 'pen', 'frog', 'table', 'chair', 'basket']
  return names[utils.random(names.length)];
}

function randomColour() {
  const names = ['wheat', 'seagreen', 'teal', 'tomato', 'dodgerblue', 'slategrey', 'plum', 'brick']
  return names[utils.random(names.length)];
}

