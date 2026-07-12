/**
 * A pool of objects of any type
 * A ring buffer of buckets that hold sets of ids to those objects
 * As we progress the ring buffer we clear out the bucket we are just about to start using 
 * - thus decaying the oldest objects from memory 
 */
export class DecayPool {
  pool = new Map(); // pool of currently being interacted with objects
  buckets = [];  // buckets (array of arrays of IDs) oldest array gets ID deleted
  currentBucket = 0; // which bucket are we filling now

  /**
   * Define a new pool of objects that will decay after decaySteps (whatever interval you decide)
   * eg: decaySteps = 60, decay() every minute = objects remain in memory for a hour
   * @param {int} decaySteps 
   */
  constructor(decaySteps = 10) {
    this.buckets = Array.from({ length: decaySteps }, () => new Set());
  }

  /**
   * Does the object exist in the pool?
   * @param {any} id 
   * @returns {boolean} 
   */
  has(id) {
    return this.pool.has(id);
  }

  /**
   * Return the object matching the id from the pool
   * @param {any} id 
   * @returns {object}
   */
  get(id) {
    return this.pool.get(id);
  }

  /**
   * Add the object with its ID to the pool and current decay bucket
   * @param {any} id 
   * @param {object} thing 
   */
  add(id, thing) {
    this.pool.set(id, thing);
    this.buckets[this.currentBucket].add(id);
  }

  /**
   * Empies the pool so we can start afresh
   */
  clear() {
    this.pool.clear();
  }

  /**
   * Decay old objects from the pool to clear memory
   * Move the ring buffer pointer on, delete from memory all objects in it, then clear the bucket
   */
  decay() {
    this.currentBucket = (this.currentBucket + 1) % this.buckets.length;
    for (const id of this.buckets[this.currentBucket]) {
      this.pool.delete(id);
    }
    this.buckets[this.currentBucket].clear();
  }
}