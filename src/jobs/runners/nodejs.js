require('@babel/register');
import Arnavon from '../../';
import JobRunner from '../runner';
import { inspect } from '../../robust';
import logger from '../../logger';
export default class NodeJSRunner extends JobRunner {
  #config;
  #module;
  constructor(config) {
    super(config);
    this.#config = config;

    if (!config.module) {
      throw new Error(`Module path expected, got ${inspect(config.module)}`);
    }

    try {
      const module = Arnavon.require(config.module);
      this.#module = module.default ? module.default : module;
    } catch (err) {
      logger.error(err);
      throw new Error(`Module '${config.module}' can't be loaded`);
    }
  }

  _run(job, context) {
    context.logger.info(`Calling loaded nodejs module ${this.#config.module}`);
    const p = this.#module(job, context);
    return p;
  }
}

