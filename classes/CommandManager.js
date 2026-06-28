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
  }

  actions = {
    look: (rest) => {
      this.tickManager.messageManager.add(`Looked around`);
    },
    create: (rest) => {
      this.tickManager.messageManager.add(`Created: ${rest}`);
    },
    build: (rest) => {
      this.tickManager.messageManager.add(`Built: ${rest}`);
    },
    drop: (rest) => {
      this.tickManager.messageManager.add(`Dropped: ${rest}`);
    },
    get: (rest) => {
      this.tickManager.messageManager.add(`Got: ${rest}`);
    },
  };

  parse(command) {
    if (!command) return;
    const [action, ...rest] = command.trim().split(/\s+/);
    const handler = this.actions[action];

    if (!handler) {
      this.tickManager.messageManager.add(`Did ${command}`);
    } else {
      handler(rest.join(" "));
    }

  }

}
