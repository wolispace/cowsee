import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import { FileManager } from './classes/FileManager.js';
import { Utilities } from './classes/Utilities.js';
import { TickManager } from './classes/TickManager.js';
import { Queue } from './classes/Queue.js';

const utils = new Utilities();

const app = {
  name: 'cowsee',
  port: process.env.PORT || 8899,
  version: '0.0.2',
  dirname: path.dirname(fileURLToPath(import.meta.url)),
};

const fileManager = new FileManager(app.dirname);
const tickManager = new TickManager();

const server = http.createServer((request, result) => {
  if (request.url === '/events') {
    return tickManager.messageManager.handle(request, result);
  }
  if (request.url === '/command' && request.method === 'POST') {
    return tickManager.commandManager.handle(request, result);
  }
  fileManager.handle(request, result, app);
});

server.listen(app.port, () => {
  console.log(`cowsee server running on http://localhost:${app['port']}`);
});




