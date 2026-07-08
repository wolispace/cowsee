import fs from 'fs';
import path from 'path';
import { IdManager } from './IdManager.js';
import { PoolManager } from './PoolManager.js';

/**
 * 
 */
export class ObjectManager {
  idManager = new IdManager();
  pools = {};

  constructor(tickManager) {
    this.tickManager = tickManager;
    for (const key of ['id', 'name', 'code', 'loc']) {
      const type = ['id','code'].includes(key) ? 'map' : 'set';
      this.pools[key] = new PoolManager(tickManager, key, type);
    }
  }

  /**
   * Returns the whole object from a chunked file
   * @param {string} id 
   * @returns {object}
   */
  findById(id) {
    return this.pools.id.get(id);
  };

  /**
   * Returns an array of IDs with the required word eg: "cat" returns ["AB", "Ax" ...]
   * @param {string} name 
   * @returns {array} of IDs with this name
   */
  findByName(name) {
    return this.pools.name.get(name);
  };

  findMatchInLoc(obj, context) {
    // TODO: for creating a new object that merges with an existing
    // loop through all objects in the location and if they match the obj.class, obj.colour etc..
    // then return it else return null
  }

  /**
   * Retruns the code for the object.id passed in
   * for consistancy, even tho its just a string, its stored in an array with one element
   * @param {id} id 
   * @returns {string}
   */
  getCode(id) {
    const codeObj = this.pools.code.get(id);
    return codeObj?.code ?? '';
  };

  /**
   * Find the first named command (look in player then location then globaly so long as its a command)
   * "find" means look for it somewhere, where as "get" means we know it so get it.
   * @param {string} firstword 
   * @param {object} context 
   * @returns {string} return the code from the bext match object
   */
  findCommand(firstword, context) {
    const ids = this.findByName(firstword);
    console.log(`find ids for ${firstword} `, ids);

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
    return '';
  };

  /**
   * Add the object to all of the pools
   * @param {obj} obj 
   */
  addToPools(obj) {
    this.pools.id.set(obj.id, obj);
    this.pools.name.set(obj.name, obj.id);
     this.pools.name.set(obj.class, obj.id);
    this.pools.loc.set(obj.loc, obj.id);
    if (obj.code) {
      this.pools.code.set( obj.id, { id: obj.id, loc: obj.loc, code: obj.code });    
    }
  }

  /**
   * Write to disk all of the changed pools
   * - merging the objects with existing json on disk
   */
  savePoolsToDisk() {
    // save changed pools to disk
    for (const pool of Object.values(this.pools)) {
      pool.saveDirty();
    }
  }

  /** ?? REDUNDANT - we add to pools and the pools save
   * Save the object, if it's new create a new ID
   * - whole objects live in the 'id' pool as this is their key 
   * - the write all dirty object to disk straight away as a test
   * @param {object} obj 
   */
  saveObject(obj) {
    // make sure we have an id
    if (!obj.id) {
      obj.id = this.idManager.new();
    } else {
      const oldObj = this.pools.id.get(obj.id);
    }
    this.pools.id.save(obj.id, obj);

    // TODO: saving an object also saves it into the loc and name etc pools
    // if the Object is being edited (not new) then we may need to remove old data from pools before saving


  
    if (oldObj) {
      this.pools.name.delete(oldObj.class, obj.id);
    }
    this.pools.name.saveIn(obj.class, obj.id);

    if (oldObj) {
      this.pools.name.delete(oldObj.class, obj.id);
    }
    this.pools.name.saveIn('loc', obj.id);


    // DEBUG: save all dirty();
    this.pools.id.saveDirty();
  }

};
