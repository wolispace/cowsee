
// a decay pool that loads from disk as needed and write out at intervals
// this manages one pool so multiple poolManagers are needed for id, name, loc etc..
export class PoolManager {
  basename = 'index_'; // the base name of the files being read and written eg index_id_0_1999.json
  key = ''; // keys are called 'id' 'name' etc..
  pool = new Map(); // pool of currently being interacted with objects
  buckets = [];  // buckets (array of arrays of IDs) oldest array gets ID deleted
  currentBucket = 0; // which bucket are we filling now
  dirtyUpdated = new Set(); // all of the modified objects
  dirtyDeleted = new Set(); // all of the deleted objects

  /**
   * A pool manager you get and set into which loads and saves to a base62 shard file eg 'index_name_D.json' 
   * (assume linux with case sensitive filenames)
   * @param {object} tickManager  
   * @param {string} keyName - what this pool is storing: ids, names, code, locations etc..?
   * @param {int} decaySteps 
   */
  constructor(tickManager, keyName = 'id', type = 'set', decaySteps = 10) {
    this.tickManager = tickManager;
    this.keyName = keyName;
    this.type = type; // == 'set' ? new Set() : new Map();
    this.basename += this.keyName;
    this.buckets = Array.from({ length: decaySteps }, () => new Set());
  }

  /**
   * Does the object exist in the pool?
   * @param {any} key 
   * @returns {boolean} 
   */
  has(key) {
    return this.pool.has(key);
  }

  /**
   * Returns the object matching the key from the pool or add it into the pool from shard file on disk
   * @param {string} key 
   * @returns {object}
   */
  get(key) {
    const cached = this.pool.get(key);
    if (cached) return cached;

    const items = this.tickManager.fileManager.loadJson(this.shardName(key));
    let item = items?.[key];
    if (!item) {
      return this.type === 'set' ? new Set() : undefined;
    }
    // convert item from the json into a Set or leave as an object
    if (this.type === 'set') {
      item = new Set(item);
    }
    // Cache it, add it to delay cache bucket, then return it
    this.pool.set(key, item);
    this.buckets[this.currentBucket].add(key);
    return item;
  }

  /**
   * Add/update the object with its ID to the pool and current decay bucket
   * @param {any} key 
   * @param {object} thing 
   */
  set(key, thing, oldKey = null) {
    const existing = this.pool.get(key);
    if (existing) {
      if (typeof thing === "string") {
        existing.add(thing);
      } else {
        this.pool.set(key, thing);
      }
    } else {
      if (typeof thing === "string") {
        this.pool.set(key, new Set());
        this.pool.get(key).add(thing);
      } else {
        this.pool.set(key, thing);
      }
    }
    this.buckets[this.currentBucket].add(key);
    // console.log(`adding [${key}] into ${this.keyName} dirtyUpdated`);
    this.dirtyUpdated.add(key);
    // remove from the previous key eg was in loc:A now in loc:B
    if (!oldKey) return;
    this.delete(oldKey, thing)
  }

  /**
   * Delete either a string from the set eg remove "Ax" from {cat:["Ax","5Rd"], card: ["EdQ"]}
   * Or delete the entire object {Ax:{id:"Ax", class:"cat"}, 5Rd: {id:5Rd, class:"cat"}, "card": {id:EdQ, class="card"}, }
   * If moving from one loc to anther{id:A, loc:B} => {id:A, loc:C} we delete A from C, so we should flag this as dirty and deleted not just delete it
   * @param {string} key 
   * @param {string|object} thing 
   * @returns 
   */
  delete(key, thing) {
    if (typeof thing === "string") {
      this.pool.get(key)?.delete(thing);
      // console.log('adding [${key}] into dirtyUpdated 2');
      this.dirtyUpdated.add(key);
      return;
    }

    this.pool.delete(key);
    this.dirtyDeleted.add(key);
  }



  /**
   * Returns the case sensitive filename using the shard based on the key eg: 'mouse' = 'index_name_m.json'
   * @param {string} key 
   * @returns {string}
   */
  shardName(key) {
    let shard = '_';
    try {
      shard = key[0] ?? '_';
    } catch {
      console.trace(`woah ${key}`);
    }
    return `${this.basename}_${shard.toLocaleLowerCase()}`;
  }


  saveDirty() {
    if (this.dirtyUpdated.size < 1) return;

    const files = new Map();

    // Group updated keys by shard file
    for (const key of this.dirtyUpdated) {
      if (!key) continue;
      const filename = this.shardName(key);
      const set = files.get(filename) ?? { updated: new Set(), deleted: new Set() };
      set.updated.add(key);
      files.set(filename, set);
    }

    // Group deleted keys by shard file
    for (const key of this.dirtyDeleted) {
      const filename = this.shardName(key);
      const set = files.get(filename) ?? { updated: new Set(), deleted: new Set() };
      set.deleted.add(key);
      files.set(filename, set);
    }

    // Apply changes to each shard file
    for (const [filename, { updated, deleted }] of files) {
      const json = this.tickManager.fileManager.loadJson(filename) ?? {};

      // Apply deletions
      for (const key of deleted) {
        delete json[key];
      }

      // Apply updates
      for (const key of updated) {
        let value = this.pool.get(key);
        if (value instanceof Set) {
          value = [...value]; // convert into an array
        }
        json[key] = value;
        // console.log(`adding to file`,key, this.pool, json);
      }
      this.tickManager.fileManager.saveJson(filename, json);
    }

    this.dirtyUpdated.clear();
    this.dirtyDeleted.clear();
  }


  /**
   * Decay old objects from the pool to clear memory
   * Move the ring buffer pointer on, delete from memory all objects in it, then clear the bucket
   */
  decay() {
    // roll on the ring buffer array of buckets
    this.currentBucket = (this.currentBucket + 1) % this.buckets.length;
    for (const key of this.buckets[this.currentBucket]) {
      if (!this.bucketsHas(key)) {
        this.pool.delete(key);
      }
    }
    this.buckets[this.currentBucket].clear();
  }

  /**
   * Does the key exist in more than one bucket meaning it has been updated so should not be removed
   * @param {string} key 
   * @returns {boolean}
   */
  bucketsHas(key) {
    let keyCount = 0;
    for (const bucket of this.buckets) {
      if (bucket.has(key)) {
        keyCount++;
        if (keyCount > 1) {
          return true;
        }
      }
    }
  }

}