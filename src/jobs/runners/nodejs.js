import path from 'path';
import JobRunner from '../runner';
import { inspect } from '../../robust';

export default class NodeJSRunner extends JobRunner {
  #config;
  #module;
  constructor(config) {
    super();
    this.#config = config;

    if (!config.module) {
      throw new Error(`Module path expected, got ${inspect(config.module)}`);
    }

    try {
      const fpath = path.join(process.cwd(), config.module);
      this.#module = require(fpath);
    } catch (err) {
      throw new Error(`Module '${config.module}' can't be loaded`);
    }
  }

  _run(job) {
    return this.#module(job);
  }
}
