import { requireUserModule } from '../../user-module';
import path from 'path';
import Arnavon from '../../';
import JobRunner, { JobRunnerConfig, JobRunnerContext } from '../runner';
import { inspect } from '../../robust';
import logger from '../../logger';
import Job from '../job';
import promClient from 'prom-client';

export interface NodeJSRunnerConfig extends JobRunnerConfig {
  module: string
  cwd?: string
}

export type NodeJSRunnerModule = (job: Job, context: JobRunnerContext) => Promise<unknown>

export default class NodeJSRunner extends JobRunner {

  private module: NodeJSRunnerModule;
  constructor(private config: NodeJSRunnerConfig, registry?: promClient.Registry) {
    super(config, registry);

    if (!config.module) {
      throw new Error(`Module path expected, got ${inspect(config.module)}`);
    }

    const cwd = config.cwd || Arnavon.cwd();

    try {
       
      const module = requireUserModule(path.join(cwd, config.module));
      this.module = (module.default ? module.default : module) as NodeJSRunnerModule;
    } catch (err) {
      logger.error(err);
      throw new Error(`Module '${config.module}' can't be loaded`, { cause: err });
    }
  }

  _run(job: Job, context: JobRunnerContext) {
    context.logger.info(`Calling loaded nodejs module ${this.config.module}`);
    const p = this.module(job, context);
    return p;
  }
}

