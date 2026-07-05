import fs from 'fs';
import path from 'path';
import { IdManager } from './IdManager.js';
import { PoolManager } from './PoolManager.js';

/**
 * 
 */
export class ObjectManager {
  idManager = new IdManager();
  pools = new Map();

  constructor(tickManager) {
    this.tickManager = tickManager;
    for (const key of ['id', 'name', 'code', 'loc']) {
      this.pools[key] = new PoolManager(tickManager, key);
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
    return this.pools.name(name);
  };

  /**
   * Retruns the code for the object.id passed in
   * @param {id} id 
   * @returns {string}
   */
  getCode(obj) {
    return this.pools.code(id);
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
