import { DecayPool } from "./DecayPool";

// a decak pool that loads from disk as needed and write out at intervals
export class PoolManager extends DecayPool {
  filename = 'index_'; // the base name of the files being read and written eg index_id_0_1999.json
  key = ''; // keys are called 'id' 'name' etc..


  constructor(type, key = 'id', decaySteps = 10) {
    super(decaySteps);
    this.filename += `${key}_`;  

  }



}