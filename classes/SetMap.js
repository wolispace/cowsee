// a Map of Sets {"A": ["a", "b", "c"], "x": ["X", "Y"]}
export class SetMap {
  constructor() {
    this.map = new Map();
  }

  add(key, value) {
    const set = this.map.get(key) ?? new Set();
    set.add(value);
    this.map.set(key, set);
  }

  get(key) {
    return this.map.get(key) ?? new Set();
  }

  /**
   * Return tru if just they key exists or the key exists and it has the value
   * @param {string} key 
   * @param {string} value 
   * @returns 
   */
  has(key, value = null) {
    if (value == null) {
      return this.map.has(key);
    }
    const set = this.map.get(key);
    return set ? set.has(value) : false;
  }

  deleteKey(key) {
    this.map.delete(key);
  }

  deleteValue(key, value) {
    const set = this.map.get(key);
    if (!set) return;
    set.delete(value);
    if (set.size === 0) this.map.delete(key);
  }

  entries() {
    return this.map.entries();
  }

  keys() {
    return this.map.keys();
  }

  values() {
    return this.map.values();
  }
}
