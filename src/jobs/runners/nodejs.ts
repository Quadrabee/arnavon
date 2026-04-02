require('@babel/register');
import path from 'path';
import Arnavon from '../../';
import JobRunner, { JobRunnerConfig, JobRunnerContext } from '../runner';
import { inspect } from '../../robust';
import logger from '../../logger';
import Job from '../job';

export interface NodeJSRunnerConfig extends JobRunnerConfig {
  module: string
  cwd?: string
}

export type NodeJSRunnerModule = (job: Job, context: JobRunnerContext) => Promise<unknown>

export default class NodeJSRunner extends JobRunner {

  private module: NodeJSRunnerModule;
  constructor(private config: NodeJSRunnerConfig) {
    super(config);

    if (!config.module) {
      throw new Error(`Module path expected, got ${inspect(config.module)}`);
    }

    const cwd = config.cwd || Arnavon.cwd();

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const module = require(path.join(cwd, config.module));
      this.module = module.default ? module.default : module;
    } catch (err) {
      logger.error(err);
      throw new Error(`Module '${config.module}' can't be loaded`);
    }
  }

  _run(job: Job, context: JobRunnerContext) {
    context.logger.info(`Calling loaded nodejs module ${this.config.module}`);
    const p = this.module(job, context);
    return p;
  }
}

