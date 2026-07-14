
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
  constructor(tickManager, keyName = 'id', decaySteps = 10) {
    this.tickManager = tickManager;
    this.keyName = keyName;
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
   * 
   */
  get(key) {
    const cached = this.pool.get(key);
    if (cached) return cached;
    console.log(`not cached ${key}`);
    const items = this.tickManager.fileManager.loadJson(this.shardName(key));
    const item = new Set(items?.[key] ?? undefined);
    // Cache it, add it to delay cache bucket, then return it
    this.pool.set(key, item);
    this.buckets[this.currentBucket].add(key);
    return item;
  }

  /**
   * Add/update the object with its ID to the pool and current decay bucket
   * if oldKey is set, that key and its contents gets deleted
   * if override is set we replace the value of key with ONLY the new thing (1:1 mapping)
   * @param {string} key 
   * @param {object} thing 
   * @param {string} oldKey
   * @param {boolean} override 
   */
  set(key, thing, oldKey = null, override = false) {
    if (override) {
      // 1:1 mapping: replace entirely with a single-element Set
      this.pool.set(key, new Set([thing]));
    } else {
      let existing = this.pool.get(key);
      if (!existing) {
        existing = new Set();
        this.pool.set(key, existing);
      }
      existing.add(thing);
    }
    this.buckets[this.currentBucket].add(key);
    this.dirtyUpdated.add(key);
    // remove from the previous key eg was in loc:A now in loc:B
    if (!oldKey) return;
    this.delete(oldKey, thing);
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
    const existing = this.pool.get(key);
    if (existing) {
      if (thing === undefined || thing === null) {
        this.pool.delete(key);
        this.dirtyDeleted.add(key);
      } else {
        existing.delete(thing);
        this.dirtyUpdated.add(key);
      }
    }
  }



  /**
   * Returns the case sensitive filename using the shard based on the key eg: 'mouse' = 'index_name_m.json'
   * @param {string} key 
   * @returns {string}
   */
  shardName(key) {
    if (!key) key = '_';
    return `${this.basename}_${key[0]}`;
    //return `${this.basename}_${key.charCodeAt(0)}`;
  }

  /**
   * Clears everything from this pool
   */
  clear() {
    this.pool.clear();
    console.log(`cleared pool ${this.keyName}`);
  }

  /**
   * Returns true if either update or delete is dirty
   * @returns {boolean}
   */
  isDirty() {
    return (this.dirtyUpdated.size > 0 || this.dirtyDeleted.size > 0);
  }


  /**
   * Saves the dirty pool, merging whats on disk so we dont stomp over it
   * @returns 
   */
  saveDirty() {
    if (!this.isDirty()) return;

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
      //console.log(`saving into ${filename}`, json);

      // Apply deletions
      for (const key of deleted) {
        delete json[key];
      }

      // Apply updates
      for (const key of updated) {
        let poolValue = this.pool.get(key);
        if (poolValue instanceof Set) {
          poolValue = [...poolValue]; // convert into an array
        }
        // Merge if diskValue exists
        const diskValue = json[key];
        let merged;
        // If the pool holds a single object (1:1 override pattern like the id pool),
        // always overwrite — never merge from disk, since Set dedup doesn't work
        // on deserialized object references.
        if (poolValue.length === 1 && typeof poolValue[0] === 'object') {
          merged = poolValue;
        } else if (Array.isArray(diskValue)) {
          merged = [...new Set([...diskValue, ...poolValue])];
        } else {
          merged = poolValue;
        }
        json[key] = merged;
        // refresh pool with this content..
        const item = new Set(json?.[key] ?? undefined);
        // Cache it, add it to decay cache bucket, then return it
        this.pool.set(key, item);
        this.buckets[this.currentBucket].add(key);
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