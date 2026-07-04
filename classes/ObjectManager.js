import fs from 'fs';
import path from 'path';
import { IdManager } from './IdManager.js';
import { DecayPool } from './DecayPool.js';


export class ObjectManager {
  pool = new DecayPool(); // pool of objects we are currently interacting with
  chunk = 10000; // how many objects in a chunk of objects so we dont load and save everything all at once
  dirty = new Set(); // all modified objects written out in batches
  idManager = new IdManager();

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
      return this.pool.get(id);
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
    // chunk into first two letters eg: index_name_lo.json = {"look": [], "lock": [], "loaf": []}
    // use bool and bucket concept to keep most recent in memory
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
   * Find the first named command (look in player then location then globaly so long as its a command)
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

/**
 * Write out all obj in this.dirtyObjects
 */
  saveDirty() {
    const chunks = new Map(); // chunkFilename → { id → obj }

    for (const id of this.dirty) {
      const obj = this.pool.get(id);
      const filename = this.chunkFilenameForId(id);

      if (!chunks.has(filename)) {
        chunks.set(filename, this.tickManager.fileManager.loadJson(filename)); // load existing chunk
      }
      chunks.get(filename)[id] = obj;
    }
    // Write updated chunks
    for (const [filename, chunkData] of chunks.entries()) {
      this.tickManager.fileManager.saveJson(filename, chunkData);
    }

    this.dirty.clear();
  }


  save(obj) {
    // make sure we have an id
    if (!obj.id) {
      obj.id = this.idManager.new();
    } 
    const foundObj = this.pool.get(obj.id);
    if (foundObj) {
      // TODO: is this overwriting the contents of the object in the pool with the new edits?
      Object.assign(foundObj, obj);
    }
    // add into our bucket so we can clear it when its old
    this.buckets[this.currentBucket].add(obj.id);

    // build additional info like longname and plural
    // add to dirty so it can get written out to disk in a batch
    this.dirty.add(obj.id);
    // add it to our pool of current objects
    this.pool.set(obj.id, obj);
    // index all the things like code, location, name, class, host
    // DEBUG: save all dirty();
    this.saveDirty();
  }

  chunkFilenameForId(id) {
    const idNumber = this.idManager.decodeInt(id);
    const start = Math.floor(idNumber / this.chunk) * this.chunk;
    return `objects_${start}_${start + this.chunk - 1}`;
  }

/**
 * Loat the relevent chunk for the ID
 * @param {string} id 
 * @returns {object}
 */
  loadChunkForId(id) {
    const filename = this.chunkFilenameForId(id);
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
