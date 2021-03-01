import fs from 'fs';
import path from 'path';
import types from './finitio';
import Finitio from 'finitio';

export default class ArnavonConfig {
  constructor(data, cwd) {
    Object.assign(this, data);
    this.cwd = cwd;
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

    // check if a schema.fio is present in same folder as config, if so use it as base finitio system
    let baseSystem;
    const folder = path.dirname(fpath);
    const schemaPath = path.join(folder, 'schema.fio');
    if (fs.existsSync(schemaPath)) {
      baseSystem = Finitio.system(fs.readFileSync(schemaPath).toString());
    }
    return new ArnavonConfig(types.ArnavonConfig.dressFromFile(fpath, baseSystem), folder);
  }
}
