require('@babel/register');
import fs from 'fs';
import path from 'path';
import types from './finitio';
import Finitio from 'finitio';
import JobConfig from '../jobs/config';
import { QueueConfig } from '../queue';
import ConsumerConfig from '../consumer/config';

export default class ArnavonConfig {

  public readonly jobs: Array<JobConfig>;
  public readonly cwd: string;
  public readonly queue: QueueConfig;
  public readonly consumers: Array<ConsumerConfig>;

  constructor(data: ArnavonConfig, cwd: string) {
    this.jobs = data.jobs;
    this.queue = data.queue;
    this.consumers = data.consumers;
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

    const configFolder = path.dirname(fpath);

    // check if a schema.world.js is present in same folder as config, if so use it as base finitio world
    let baseWorld = null;
    const worldPath = path.join(configFolder, 'schema.world.js');
    if (fs.existsSync(worldPath)) {
      baseWorld = require(path.relative(__dirname, worldPath));
      baseWorld = baseWorld && baseWorld.default ? baseWorld.default : baseWorld;
    }

    // check if a schema.fio is present in same folder as config, if so use it as base finitio system
    let baseSystem;
    const schemaPath = path.join(configFolder, 'schema.fio');
    if (fs.existsSync(schemaPath)) {
      baseSystem = Finitio.system(fs.readFileSync(schemaPath).toString(), { JsTypes: baseWorld });
    }

    return new ArnavonConfig(types.ArnavonConfig.dressFromFile(fpath, baseSystem), configFolder);
  }
}
