require('@babel/register');
import Arnavon from '../../';
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
      this.#module = Arnavon.require(config.module);
    } catch (err) {
      throw new Error(`Module '${config.module}' can't be loaded`);
    }
  }

  _run(job) {
    const p = this.#module(job);
    console.log('pp is', p);
    return p;
  }
}

