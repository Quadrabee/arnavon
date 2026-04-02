import JobRunner, { JobRunnerConfig, JobRunnerContext } from '../runner';
import Job from '../job';
import promClient from 'prom-client';

export type HandlerFn = (job: Job, context: JobRunnerContext) => Promise<unknown>

export interface FunctionRunnerConfig extends JobRunnerConfig {
  handler: HandlerFn
}

export default class FunctionRunner extends JobRunner {

  private handler: HandlerFn;

  constructor(config: FunctionRunnerConfig, registry?: promClient.Registry) {
    super(config, registry);
    this.handler = config.handler;
  }

  _run(job: Job, context: JobRunnerContext) {
    return this.handler(job, context);
  }
}
