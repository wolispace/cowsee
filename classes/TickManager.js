import { MessageManager } from './MessageManager.js';
import { CommandManager } from './CommandManager.js';
import { ObjectManager } from './ObjectManager.js';
import { FileManager } from './FileManager.js';


export class TickManager {
  interval = 5_000;
  constructor(testing = false) {
    this.commandManager = new CommandManager(this);
    this.messageManager = new MessageManager(this);
    this.fileManager = new FileManager(this);
    this.objectManager = new ObjectManager(this);
    
    if (testing) return;
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
      const payload = this.messageManager.get();
      this.messageManager.send(payload);
      setImmediate(() => this.#process());
      return;
    }

    // Nothing left to do
    this.#isProcessing = false;
    // TODO: do this better - when idle save changes to disk
    this.objectManager.savePoolsToDisk();
  }
}
