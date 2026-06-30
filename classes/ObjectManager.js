import fs from 'fs';
import path from 'path';
import { PoolObject } from './PoolObject.js';
import { IdManager } from './IdManager.js';


export class ObjectManager {
  filename = 'objects_0_BB.json';
  objects = {};
  pool = new Map(); // pool of currently being interacted with objects
  // buckets (array of arrays of IDs) oldest array gets ID deleted
  buckets = Array.from({ length: 60 }, () => new Set());
  currentBucket = 0;
  idManager = new IdManager();
  chunk = 1000; // how many obejcts in a chunk of objects so we dont load and save everything all at once

  constructor(tickManager) {
    this.tickManager = tickManager;
  }

  /**
   * Returns the whole object from a chunked file
   * @param {string} id 
   * @returns {object}
   */
  findById(id) {
    if (this.pool.has(id)) {
      return pool.get(id);
    }
    // Not in pool → load from chunk
    const chunk = loadChunkForId(id);
    console.log(chunk);
    // add all objects from chunk into the pool
    for (const [cid, obj] of Object.entries(chunk)) {
      this.pool.set(cid, obj);
      // add into current bucket for later eviction
      this.buckets[this.currentBucket].add(id);
    }
    return pool.get(id);
  };

  /**
   * Returns an array of IDs with the required word eg: "cat" returns ["AB", "Ax" ...]
   * @param {string} name 
   * @returns {array} of IDs with this name
   */
  findByName(name) {
    if (!this.names) {
      this.names = this.tickManager.fileManager.loadJson('index_name');
    }
    // all names are in memory.. is this wise?
    // need to update words when saving
    return this.names[name];
  };

  /**
   * Retruns the code for the object.id passed in
   * @param {object} obj 
   * @returns {string}
   */
  getCode(obj) {
    if (!this.code) {
      this.codes = this.tickManager.fileManager.loadJson('index_code');
    }
    // all code is stored in memory
    // need to update it when a coded object is saved
    return this.codes[obj.id];
  };

  /**
   * First the first named command (look in player then location then globaly so long as its a command)
   * @param {string} firstword 
   * @param {object} context 
   * @returns {string} return the code from the bext match object
   */
  findCommand(firstword, context) {
    const ids = this.findByName(firstword);
    if (!ids || ids.length < 1) return;
    if (ids.length === 1) {
      return this.getCode(ids[0]);
    }
    for (let index = 0; index < ids.length; index++) {
      const obj = ids[index];
      if (obj.loc === context.actor) {
        return obj.code;
      }
      if (obj.loc === context.loc) {
        return obj.code;
      }
      if (obj.class === 'command') {
        return obj.code;
      }
    }
  };

  // chunkFilenameForId(id) {
  //   const intId = this.idManagerd.ecodeInt(id);
  // }

  flushDirty() {
    const chunks = new Map(); // chunkFilename → { id → obj }

    for (const id of this.dirtyObjects) {
      const poolObject = this.pool.get(id);
      if (!poolObject) continue;

      const filename = chunkFilenameForId(id);

      if (!chunks.has(filename)) {
        chunks.set(filename, loadChunk(filename)); // load existing chunk
      }

      chunks.get(filename)[id] = poolObject.obj;
      poolObject.dirty = false;
    }

    // Write updated chunks
    for (const [filename, chunkData] of chunks.entries()) {
      saveChunk(filename, chunkData);
    }

    dirtySet.clear();
  }


  save(obj) {
    // we would not be saving if we didnt already have the object in the pool
    const poolObject = this.pool.get(obj.id);
    if (!poolObject) return;

    this.buckets[this.currentBucket].add(id);
    // TODO: is this overwriting the contents of the object in the pool with the new edits?
    Object.assign(poolObject.obj, obj);

    // build additional info like longname and plural
    // get a new ID if needed
    // get the obj file it needs to be written to
    // add it
    // index all the things like code, location, name, class, host
  }

/**
 * Loat the relevent chunk for the ID
 * @param {string} id 
 * @returns {object}
 */
  loadChunkForId(id) {
    const idNumber = this.idManager.decodeInt(id);
    const start = Math.floor(n / this.chunk) * this.chunk;
    const filename = `objects_${start}_${start + this.chunk - 1}`;
    return this.tickManager.fileManager.loadJson(filename);
  }

  /**
   * When this runs it drops off the oldes IDs from the pool
   */
  evictOldObjects() { // 5 minutes
    this.currentBucket = (this.currentBucket + 1) % this.buckets.length;
    for (const id of this.buckets[this.currentBucket]) {
      this.pool.delete(id);
    }
    this.buckets[this.currentBucket].clear();
  }

};
