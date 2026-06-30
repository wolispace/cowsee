export class PoolObject {
  obj = {}; // the entire cow objects {id: "Ab", loc: "z", class="book" name="of coding" ...}

  constructor(obj) {
    this.obj = obj;
    this.touch();
  }

  /**
   * Each interaction updates the object in the pool
   */
  touch() {
    this.lastTouch = Date.now();
  }




}





