import fs from 'fs';
import path from 'path';
import { Queue } from './Queue.js';
import { Utilities } from './Utilities.js';


export class CommandManager extends Queue {

  subs = {};
  context = {}; // the context the statement is run agains (which actor which location etc..)
  
  constructor(tickManager) {
    super();
    this.tickManager = tickManager;
    this.utils = new Utilities();

  }

  handle(request, result) {
    let body = '';
    request.on('data', chunk => body += chunk);
    request.on('end', () => {
      const command = JSON.parse(body);
      this.add(command);
      // TODO: example of a save 
      // this.tickManager.objectManager.save({id:"G", loc:"z", class:"mouse"});
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
      command.actor = 'wolis'; // DEBUG - player is wolis. this is not right, [$actor] needs to be converted ingo an ID which then is converted into a name and a link in the browser
      this.parse(command);
    }
  }

  /**
   * Splits off the first word, leaving the rest
   * @param {string} whole 
   * @returns {firstword, rest, whole}
   */
  splitFirstWord(whole) {
    const trimmed = whole.trim();
    const spaceIndex = trimmed.indexOf(' ');
    let firstword = spaceIndex === -1 ? trimmed : trimmed.substring(0, spaceIndex);
    let rest = spaceIndex === -1 ? '' : trimmed.substring(spaceIndex + 1).trim();
    return { firstword, rest };
  }
  /**
   * parse user input (specifically focusing on 'say')
   * @param {object} commandObj { cmd: "say hello everyone", actor: "wolis", loc: "A", niceness: 0 }
   */
  parse(commandObj) {
    // reset reactions after a human sends something
    this.tickManager.objectManager.reactions = 0;
    const rawCmd = commandObj.cmd;
    if (!rawCmd) return;

    const { firstword, rest } = this.splitFirstWord(rawCmd);
    // Build execution context
    this.context = {
      actor: commandObj.actor || 'wolis',
      loc: commandObj.loc || '2',
      niceness: commandObj.niceness || 0,
      cmd_text: rest,
      prefix: '',
      text: '',
      rel: '',
      target: ''
    };

    const code = this.tickManager.objectManager.findCommand(firstword, this.context);
    if (!code) {
        this.tickManager.messageManager.add({
        msg: `[$actor] trys to ${rawCmd}, but nothing happens`,
        context: this.context
      });
      return;
    };
    this.runCodeFrom(code, '__start');
    // console.log(`running ${firstword}`, JSON.stringify(this.context));
  }

  /**
   * Sets up the context to run the code from the block
   * @param {string} code 
   * @param {string} block 
   * @param {object} context 
   */
  runCodeFrom(code, block, context = this.context) {
    // console.log('running ', block, JSON.stringify(context), JSON.stringify(this.context), code);
    this.context = context;
    // Partition cowscript code into sub-blocks
    this.partitionCode(code);
    // Execute from __start
    this.runSub(block);
  }

  /**
   * Partitions the cowscript code by ## into subroutines
   */
  partitionCode(code) {
    // Clean carriage returns
    const cleanCode = code.replace(/\r/g, '').replace(/\n/g, ' ');

    // Split on ##
    // We prefix with ##__start: to catch the initial statements
    const blocks = ('##__start:' + cleanCode).split('##');
    for (const block of blocks) {
      if (!block.trim()) continue;
      const colonIndex = block.indexOf(':');
      if (colonIndex !== -1) {
        const subName = block.substring(0, colonIndex).trim();
        const subContent = block.substring(colonIndex + 1).trim();
        this.subs[subName] = subContent;
      }
    }
  }

  /**
   * Executes a subroutine block line-by-line (semicolon separated)
   */
  runSub(subName) {
    const subContent = this.subs[subName];
    if (!subContent) {
      return;
    }
    const statements = subContent.split(';');
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (!trimmedStatement) continue;
      this.executeStatement(trimmedStatement);
    }
  }

  /**
   * Executes a single statement
   */
  executeStatement(statement) {
    // console.log({statement});
    const trimmed = statement.trim();
    if (!trimmed) return;

    const { firstword, rest } = this.splitFirstWord(trimmed);

    // Flexible handling for variable assignments without the "var" keyword
    // e.g. `$prefix to (sweetly, nicely)` -> rewritten as `var $prefix to ...`
    if (firstword.startsWith('$')) {
      rest = `${firstword} ${rest}`;
      firstword = 'var';
    }

    const handler = this.statementList[firstword.toLowerCase()];
    if (handler) {
      // Pass the remaining string
      handler(rest);
    } else {
      console.warn(`No handler found for statement keyword: "${firstword}"`);
    }
  }

  /**
   * Resolve a value: literal, $var, or $actor's loc's host's loc chain
   */
  resolveValue(token) {
    const t = token.trim();
    if ((t.startsWith('"') && t.endsWith('"')) ||
        (t.startsWith("'") && t.endsWith("'"))) {
      return t.substring(1, t.length - 1);
    }
    if (!t.startsWith('$')) return t;

    const parts = t.split("'s ");
    const varName = parts[0].substring(1);
    let value = this.context[varName] ?? '';

    for (let i = 1; i < parts.length; i++) {
      const obj = this.tickManager.objectManager.getById(value);
      if (!obj) return '';
      value = obj[parts[i]] ?? '';
    }
    return value;
  }

  /**
   * Parse a natural language object description into its components
   * e.g. "3 small black fluffy mice" → { qty, colour, attribs, class, name }
   */
  parseObj(str) {
    const colours = ['red','orange','yellow','green','blue','purple','pink','black','white','grey','gray','brown','silver','gold'];
    const sizes   = ['tiny','small','little','large','big','huge','giant','massive'];
    const words   = str.trim().replace(/^["']|["']$/g, '').split(/\s+/);
    let qty = 1;
    let colour = '', attribs = [], cls = '', name = '';
    let i = 0;
    if (/^\d+$/.test(words[0])) { qty = parseInt(words[i++]); }
    const articles = ['a','an','the','some'];
    if (articles.includes(words[i]?.toLowerCase())) i++;
    while (i < words.length) {
      const w = words[i].toLowerCase();
      if (!colour && colours.includes(w))      { colour = w; i++; }
      else if (sizes.includes(w))              { attribs.push(w); i++; }
      else                                     { break; }
    }
    cls  = words[i]   || '';
    name = words.slice(i + 1).join(' ');
    return { qty, colour, attribs: attribs.join(' '), class: cls, name };
  }

  /**
   * Helper to mock target resolution
   */
  resolveTarget(targetName, loc) {
    if (!targetName) return 0;
    const lowerName = targetName.toLowerCase();
    if (lowerName === 'everyone' || lowerName === 'all' || lowerName === 'bob' || lowerName === 'wolis') {
      return 42;
    }
    return 0;
  }

  // ------------------------------------------------------------------------------
  // all of the cowmands or statements of a block in cowscript
  statementList = {
    // GET handler
    get: (rest) => {
      let getLocVar = 'loc';
      let variablesPart = rest;
      let match = rest.match(/(.+)\s+in\s+\$(\w+)/i);
      if (match) {
        variablesPart = match[1].trim();
        getLocVar = match[2];
      }

      const getLocValue = this.context[getLocVar] || '';
      const variables = variablesPart.split(',').map(s => s.trim().substring(1)); // strip $

      if (variables.length === 3) {
        const relWords = ['to', 'on', 'in', 'at', 'under', 'towards'];
        const relRegex = new RegExp(`^(.*?)\\s+(${relWords.join('|')})\\s+(.*)$`, 'i');
        match = this.context.cmd_text.match(relRegex);
        if (match) {
          this.context[variables[0]] = match[1].trim(); // text
          this.context[variables[1]] = match[2].trim(); // rel
          const rawTarget = match[3].trim();
          this.context[variables[2]] = this.resolveTarget(rawTarget, getLocValue);
        } else {
          this.context[variables[0]] = this.context.cmd_text;
          this.context[variables[1]] = '';
          this.context[variables[2]] = 0;
        }
      } else if (variables.length === 1) {
        this.context[variables[0]] = this.context.cmd_text;
      }
    },

    // IF/THEN/ELSE handler
    if: (rest) => {
      let match = rest.match(/^(.+?)\s+(equals|is|like|in|eq|ne|>|<|!=|>=|<=|=|==)\s+(.+?)\s+then\s+(.+)$/i);
      if (!match) return;

      const op1Raw = match[1].trim();
      const operator = match[2].toLowerCase();
      const op2Raw = match[3].trim();
      const actionsPart = match[4].trim();

      const val1 = this.resolveValue(op1Raw);
      const val2 = this.resolveValue(op2Raw);

      let conditionMet = false;
      if (['>', '<', '>=', '<='].includes(operator)) {
        const num1 = parseFloat(val1) || 0;
        const num2 = parseFloat(val2) || 0;
        if (operator === '>') conditionMet = num1 > num2;
        if (operator === '<') conditionMet = num1 < num2;
        if (operator === '>=') conditionMet = num1 >= num2;
        if (operator === '<=') conditionMet = num1 <= num2;
      } else if (operator === 'like') {
        const cleanVal2 = val2.toString().replace(/^['"]|['"]$/g, '');
        conditionMet = val1.toString().toLowerCase().includes(cleanVal2.toLowerCase());
      } else {
        const eq = (val1.toString() === val2.toString());
        conditionMet = (operator === 'ne' || operator === '!=') ? !eq : eq;
      }

      const elseIndex = actionsPart.indexOf(' else ');
      let thenSub, elseSub;
      if (elseIndex !== -1) {
        thenSub = actionsPart.substring(0, elseIndex).trim();
        elseSub = actionsPart.substring(elseIndex + 6).trim();
      } else {
        thenSub = actionsPart;
        elseSub = '';
      }

      if (conditionMet) {
        if (thenSub) this.runSub(thenSub);
      } else {
        if (elseSub) this.runSub(elseSub);
      }
    },

    // VAR handler
    var: (rest) => {
      const cleanRest = rest.replace(/^var\s+/i, '');
      let match = cleanRest.match(/^(\$\w+)\s+(?:to|=)\s+(.+)$/i);
      if (!match) return;

      const varName = match[1].substring(1);
      const rawVal = match[2].trim();

      if (rawVal.startsWith('(') && rawVal.endsWith(')')) {
        const choices = rawVal.substring(1, rawVal.length - 1).split(',').map(s => s.trim());
        const selected = choices[Math.floor(Math.random() * choices.length)];
        this.context[varName] = selected;
      } else {
        this.context[varName] = this.resolveValue(rawVal);
      }
    },

    // SAY handler
    say: (rest) => {
      const match = rest.match(/^['"](\w+)['"]\s*,\s*(.+)$/i);
      if (!match) return;
      // include the trigger word 'say' or 'ask' into the context so we can find which objects react to it
      this.context.trigger = (match[1]);

      this.tickManager.messageManager.add({
        msg:  this.utils.trimQuotes(match[2].trim()),
        context: this.context
      });
    },
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
    getname: (rest) => { console.log(`getname`) },
    goto: (rest) => { console.log(`goto`) },
    include: (rest) => { console.log(`include`) },
    load: (rest) => { console.log(`load`) },
    loop: (rest) => { console.log(`loop`) },
    mode: (rest) => { console.log(`mode`) },
    motion: (rest) => { console.log(`motion`) },
    msg: (rest) => { console.log(`msg`) },
    multiply: (rest) => { console.log(`multiply`) },
    new: (rest) => {
      const parsed = this.parseObj(this.resolveValue(rest.trim()));
      const om = this.tickManager.objectManager;
      const loc = this.context.loc;
      // find existing object with same class+name in this loc to stack onto
      // let existing = null;
      // for (const [id, obj] of om.pool) {
      //   if (obj.loc === loc && obj.class === parsed.class && obj.name === parsed.name) {
      //     existing = obj; break;
      //   }
      // }
      // if (existing) {
      //   existing.qty = (existing.qty || 1) + parsed.qty;
      //   om.save(existing);
      //   this.context.target = existing.id;
      // } else {
      //   const obj = { loc, ...parsed };
      //   om.save(obj);
      //   this.context.target = obj.id;
      // }
      
      // quick and simple object creator
      const obj = { loc, ...parsed };
      obj.id = om.idManager.new();
      om.addToPools(obj);
      this.context.target = this.context.cmd_text;
      this.context.new_id = obj.id;
      console.log('created', obj, this.context);

    },
    nudge: (rest) => { console.log(`nudge`) },
    percentbar: (rest) => { console.log(`percentbar`) },
    refresh: (rest) => { console.log(`refresh`) },
    relook: (rest) => {
      this.context.loc = this.resolveValue(rest.trim());
      this.tickManager.objectManager.lookLoc(this.context);
      // // TODO: this "force" should queue up a new command from the 'actor' to 'look'
      // this.tickManager.messageManager.add({

      //   msg: `force:look ${loc}`,
      //   actor: this.context.actor,
      //   loc: loc,
      //   context: this.context
      // });
    },
    runsub: (rest) => { console.log(`runsub`) },
    save: (rest) => { console.log(`save`) },
    set: (rest) => { console.log(`set`) },
    swap: (rest) => { console.log(`swap`) },
    take: (rest) => { console.log(`take`) },
    unhost: (rest) => { console.log(`unhost`) },
  };


  /**
   * Find the objects in the data.context.loc that react to this trigger word
   * loop through each and see if they are triggered in this context
   * @param {object} data 
   */
  reactions(data) {
    // eg 'ask', there is a robot in your location that "has statement "if taget of 'say' then answer;
    this.tickManager.objectManager.findTrigger(data.context);

  }
}
