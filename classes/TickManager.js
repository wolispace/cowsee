import { MessageManager } from './MessageManager.js';
import { CommandManager } from './CommandManager.js';
import { ObjectManager } from './ObjectManager.js';


export class TickManager {
  interval = 5_000;
  constructor() {
    this.commandManager = new CommandManager(this);
    this.messageManager = new MessageManager(this);
    this.objectManager = new ObjectManager();
     
    setInterval(() => this.doNext(), this.interval);
  }

  #isProcessing = false;

  doNext() {
    if (this.#isProcessing) return;
    this.#isProcessing = true;
    this.#process();
  }

  #process() {
    // Process one command if available
    if (this.commandManager.pending()) {
      this.commandManager.doNext();
      setImmediate(() => this.#process());
      return;
    }

    // Process one message if available
    if (this.messageManager.pending()) {
      const message = this.messageManager.get();
      this.messageManager.send({ message });
      setImmediate(() => this.#process());
      return;
    }

    // Nothing left to do
    this.#isProcessing = false;
  }
}
