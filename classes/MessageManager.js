import { Queue } from './Queue.js';
/**
 * Handles the Server Side Events (SSE) hence cowsee (yes I know sse and see but see is nicer)
 */
export class MessageManager extends Queue {

  #clients = new Set();

  constructor(tickManager) {
    super();
    this.tickManager = tickManager;
  }

  add(data) {
    this.tickManager.objectManager.prepContext(data);
    super.add(data);
    this.tickManager.doNext();
  }

  handle(request, result) {
    result.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    this.#clients.add(result);
    this.send({ type: {status: 'started'} });
    request.on('close', () => this.#clients.delete(result));
  }

  send(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const result of this.#clients) result.write(payload);
    this.tickManager.commandManager.reactions(data);
  }

}
