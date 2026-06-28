import { Queue } from './Queue.js';

export class CommandManager extends Queue{

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
        // parse command
        // usualy this involves send in message back to the user
        const message = command;
        this.tickManager.messageManager.add(message);
      }
  }
}
