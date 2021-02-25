import fs from 'fs';
import path from 'path';
import Finitio from './finitio';

export default class ArnavonConfig {
  constructor(data) {
    Object.assign(this, data);
  }

  static fromFile(fname = 'config.yaml') {
    const fpath = path.join(process.cwd(), fname);
    try {
      fs.accessSync(fpath, fs.constants.R_OK);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`Config file not found: '${fname}'.`);
      }
      if (err.code === 'EACCES') {
        throw new Error(`Config file '${fname}' is not readable, check permissions.`);
      }
      throw err;
    }

    return new ArnavonConfig(Finitio.ArnavonConfig.dressFromFile(fpath));
  }
}
