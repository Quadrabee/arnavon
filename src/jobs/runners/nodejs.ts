require('@babel/register');
import Arnavon from '../../';
import JobRunner, { JobRunnerConfig, JobRunnerContext } from '../runner';
import { inspect } from '../../robust';
import logger from '../../logger';

export interface NodeJSRunnerConfig extends JobRunnerConfig {
  module: string
}

export type NodeJSRunnerModule = (job: any, context: JobRunnerContext) => Promise<any>

export default class NodeJSRunner extends JobRunner {

  private module: NodeJSRunnerModule;
  constructor(private config: NodeJSRunnerConfig) {
    super(config);

    if (!config.module) {
      throw new Error(`Module path expected, got ${inspect(config.module)}`);
    }

    try {
      const module = Arnavon.require(config.module);
      this.module = module.default ? module.default : module;
    } catch (err) {
      logger.error(err);
      throw new Error(`Module '${config.module}' can't be loaded`);
    }
  }

  _run(job: any, context: JobRunnerContext) {
    context.logger.info(`Calling loaded nodejs module ${this.config.module}`);
    const p = this.module(job, context);
    return p;
  }
}

