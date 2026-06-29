import { Queue } from './Queue.js';

export class CommandManager extends Queue {

  constructor(tickManager) {
    super();
    this.tickManager = tickManager;
  }

  handle(request, result) {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      const command = JSON.parse(body);
      this.add(command);
      result.writeHead(200, { 'Content-Type': 'application/json' });
      result.end(JSON.stringify({ ok: true }));
      this.tickManager.doNext();
    });
  }

  /**
   * Take the next command off the queue and parse it and process the bits
   */
  doNext() {
    if (this.pending()) {
      const command = this.get();
      this.parse(command.cmd);
      // // parse command
      // // usualy this involves send in message back to the user
      // const message = command;
      // this.tickManager.messageManager.add(message);
    }
  };

  cowmandList = {
    add: (rest) => { console.log(`add`) },
    call: (rest) => { console.log(`call`) },
    case: (rest) => { console.log(`case`) },
    clear: (rest) => { console.log(`clear`) },
    code: (rest) => { console.log(`code`) },
    copy: (rest) => { console.log(`copy`) },
    dedup: (rest) => { console.log(`dedup`) },
    divide: (rest) => { console.log(`divide`) },
    find: (rest) => { console.log(`find`) },
    fixplural: (rest) => { console.log(`fixplural`) },
    foreach: (rest) => { console.log(`foreach`) },
    get: (rest) => { console.log(`get`) },
    getname: (rest) => { console.log(`getname`) },
    goto: (rest) => { console.log(`goto`) },
    if: (rest) => { console.log(`if`) },
    include: (rest) => { console.log(`include`) },
    load: (rest) => { console.log(`load`) },
    loop: (rest) => { console.log(`loop`) },
    mode: (rest) => { console.log(`mode`) },
    motion: (rest) => { console.log(`motion`) },
    msg: (rest) => { console.log(`msg`) },
    multiply: (rest) => { console.log(`multiply`) },
    new: (rest) => { console.log(`new`) },
    nudge: (rest) => { console.log(`nudge`) },
    percentbar: (rest) => { console.log(`percentbar`) },
    refresh: (rest) => { console.log(`refresh`) },
    runsub: (rest) => { console.log(`runsub`) },
    save: (rest) => { console.log(`save`) },
    say: (rest) => { console.log(`say`) },
    set: (rest) => { console.log(`set`) },
    swap: (rest) => { console.log(`swap`) },
    take: (rest) => { console.log(`take`) },
    unhost: (rest) => { console.log(`unhost`) },
    var: (rest) => { console.log(`unhost`) },
  };


  /**
   *  parse user input 'create a small fulffy mouse' or 'look'
   * @param {string} command 
   * @returns 
   */
  parse(command) {
    if (!command) return;
    // get all objects called name
    // if one found then extract its code, split into blocks and execute them 
    // Is one in the player (found.loc == player.id) then execute that
    // is one in the same location as the player (found.loc == player.loc) then execute that
    // if one is a 'command' (found.class == 'command') then execute that
    // else nothing to do
  };

  /**
   * Split the string of cowscript into blocks to be processes
   * @param {string} cowscript 
   */
  run(cowscript) {
    // split the cowscript into blocks
    const blocks = cowscript.split('##');
    for (const block of blocks) {
      this.process(block);
    }
  }

  /**
   * split the block into cowmands
   * @param {string} block 
   */
  process(block) {
    const cowmands = block.split(';');
    for(const cowmand of cowmands) {
      execute(cowmand);
    }
  }

  /**
   * Execute a single line of a cowscript cowmand 'new $target' or 'say $rest'
   * @param {string} cowmand 
   */
  execute(cowmand) {
    const [name, ...rest] = cowmand.trim().split(/\s+/);
    const handler = this.cowmands[name];

    if (!handler) {
      this.tickManager.messageManager.add(`Did ${rest}`);
    } else {
      handler(rest.join(" "));
    }
  }
}
