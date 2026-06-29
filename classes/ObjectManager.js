import fs from 'fs';
import path from 'path';

export class ObjectManager {
  filename = 'objects_0_BB.json';
  objects = {};

  constructor(tickManager) {
    this.tickManager = tickManager;
  }

  /**
   * Returns the whole object from a chunked file
   * @param {string} id 
   * @returns {object}
   */
  fundById(id) {
    this.objects = this.tickManager.fileManager.loadJson(this.filename);
    return this.objects[id] ?? [];
  };

  /**
   * Returns an array of IDs with the required word eg: "cat" returns ["AB", "Ax" ...]
   * @param {string} name 
   * @returns {array} of IDs with this name
   */
  findByName(name) {
    this.names = this.tickManager.fileManager.loadJson('index_name');
    return this.names[name];
  };

  /**
   * Retruns the code for the object.id passed in
   * @param {object} obj 
   * @returns {string}
   */
  getCode(obj) {
    this.codes = this.tickManager.fileManager.loadJson('index_code');
    return this.codes[obj.id];
  };
  
  /**
   * First the first named command (look in player then location then globaly so long as its a command)
   * @param {string} firstword 
   * @param {object} context 
   * @returns {string} return the code from the bext match object
   */
  findCommand(firstword, context) {
    // find all objects with a matching name eg 'command called say'
    const ids = this.findByName(firstword);
    console.log({firstword});
    if (!ids || ids.length < 1) return;
    if (ids.length === 1) {
      return this.getCode(ids[0]);
    }
    for (let index = 0; index < ids.length; index++) {
      const obj = ids[index];
      console.log({firstword});
      console.log(obj);
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

};
