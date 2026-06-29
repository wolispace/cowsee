import fs from 'fs';
import path from 'path';
import { Queue } from './Queue.js';

export class CommandManager extends Queue {

  subs = {};
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
      command.actor = 'z'; // DEBUG - player is wolis
      this.parse(command);
    }
  }

  statementList = {
    // 1. GET handler
    get: (rest, context) => {
      let getLocVar = 'loc';
      let variablesPart = rest;
      const inMatch = rest.match(/(.+)\s+in\s+\$(\w+)/i);
      if (inMatch) {
        variablesPart = inMatch[1].trim();
        getLocVar = inMatch[2];
      }

      const getLocValue = context[getLocVar] || '';
      const variables = variablesPart.split(',').map(s => s.trim().substring(1)); // strip $

      if (variables.length === 3) {
        const relWords = ['to', 'on', 'in', 'at', 'under', 'towards'];
        const relRegex = new RegExp(`^(.*?)\\s+(${relWords.join('|')})\\s+(.*)$`, 'i');
        const match = context.cmd_text.match(relRegex);
        if (match) {
          context[variables[0]] = match[1].trim(); // text
          context[variables[1]] = match[2].trim(); // rel
          const rawTarget = match[3].trim();
          context[variables[2]] = this.resolveTarget(rawTarget, getLocValue);
        } else {
          context[variables[0]] = context.cmd_text;
          context[variables[1]] = '';
          context[variables[2]] = 0;
        }
      } else if (variables.length === 1) {
        context[variables[0]] = context.cmd_text;
      }
    },

    // 2. IF/THEN/ELSE handler
    if: (rest, context) => {
      const ifMatch = rest.match(/^(.+?)\s+(equals|is|like|in|eq|ne|>|<|!=|>=|<=|=|==)\s+(.+?)\s+then\s+(.+)$/i);
      if (!ifMatch) return;

      const op1Raw = ifMatch[1].trim();
      const operator = ifMatch[2].toLowerCase();
      const op2Raw = ifMatch[3].trim();
      const actionsPart = ifMatch[4].trim();

      const val1 = this.resolveValue(op1Raw, context);
      const val2 = this.resolveValue(op2Raw, context);

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
        if (thenSub) this.runSub(thenSub, context);
      } else {
        if (elseSub) this.runSub(elseSub, context);
      }
    },

    // 3. VAR handler
    var: (rest, context) => {
      const cleanRest = rest.replace(/^var\s+/i, '');
      const varMatch = cleanRest.match(/^(\$\w+)\s+(?:to|=)\s+(.+)$/i);
      if (!varMatch) return;

      const varName = varMatch[1].substring(1);
      const rawVal = varMatch[2].trim();

      if (rawVal.startsWith('(') && rawVal.endsWith(')')) {
        const choices = rawVal.substring(1, rawVal.length - 1).split(',').map(s => s.trim());
        const selected = choices[Math.floor(Math.random() * choices.length)];
        context[varName] = selected;
      } else {
        context[varName] = this.resolveValue(rawVal, context);
      }
    },

    // 4. SAY handler
    say: (rest, context) => {
      const sayMatch = rest.match(/^['"](\w+)['"]\s*,\s*(.+)$/i);
      if (!sayMatch) return;

      const msgType = sayMatch[1];
      let msgTemplate = sayMatch[2].trim();
      if (msgTemplate.startsWith('"') && msgTemplate.endsWith('"') ||
        msgTemplate.startsWith("'") && msgTemplate.endsWith("'")) {
        msgTemplate = msgTemplate.substring(1, msgTemplate.length - 1);
      }

      let msg = msgTemplate;
      msg = msg.replace(/\[\$(\w+)\]/g, (match, name) => context[name] !== undefined ? context[name] : '');
      msg = msg.replace(/\$(\w+)/g, (match, name) => context[name] !== undefined ? context[name] : '');
      msg = msg.replace(/\s+/g, ' ').trim();

      this.tickManager.messageManager.add({
        type: msgType,
        text: msg,
        actor: context.actor,
        loc: context.loc
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
    new: (rest) => { console.log(`new`) },
    nudge: (rest) => { console.log(`nudge`) },
    percentbar: (rest) => { console.log(`percentbar`) },
    refresh: (rest) => { console.log(`refresh`) },
    runsub: (rest) => { console.log(`runsub`) },
    save: (rest) => { console.log(`save`) },
    set: (rest) => { console.log(`set`) },
    swap: (rest) => { console.log(`swap`) },
    take: (rest) => { console.log(`take`) },
    unhost: (rest) => { console.log(`unhost`) },
  };

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
    const rawCmd = commandObj.cmd;
    if (!rawCmd) return;

    const { firstword, rest } = this.splitFirstWord(rawCmd);
    // Build execution context
    const context = {
      actor: commandObj.actor || 'wolis',
      loc: commandObj.loc || 'A',
      niceness: commandObj.niceness || 0,
      cmd_text: rest,
      prefix: '',
      text: '',
      rel: '',
      target: ''
    };

    const code = this.tickManager.objectManager.findCommand(firstword, context);
    if (!code) return;
    // Partition cowscript code into sub-blocks
    this.partitionCode(code);
    // Execute from __start
    this.runSub('__start', context);
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
    // return subs;
  }

  /**
   * Executes a subroutine block line-by-line (semicolon separated)
   */
  runSub(subName, context) {
    const subContent = this.subs[subName];
    if (!subContent) {
      return;
    }

    const statements = subContent.split(';');
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (!trimmedStatement) continue;
      this.executeStatement(trimmedStatement, context);
    }
  }

  /**
   * Executes a single statement
   */
  executeStatement(statement, context) {
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
      // Pass the remaining string, context
      handler(rest, context);
    } else {
      console.warn(`No handler found for statement keyword: "${firstword}"`);
    }
  }

  /**
   * Helper to resolve variable names or literal values
   */
  resolveValue(token, context) {
    if (token.startsWith('$')) {
      const varName = token.substring(1);
      return context[varName] !== undefined ? context[varName] : '';
    }
    if ((token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))) {
      return token.substring(1, token.length - 1);
    }
    return token;
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
}
