import JobRunner, { JobRunnerConfig, JobRunnerContext } from '../runner';
import Job from '../job';

export type HandlerFn = (job: Job, context: JobRunnerContext) => Promise<unknown>

export interface FunctionRunnerConfig extends JobRunnerConfig {
  handler: HandlerFn
}

export default class FunctionRunner extends JobRunner {

  private handler: HandlerFn;

  constructor(config: FunctionRunnerConfig) {
    super(config);
    this.handler = config.handler;
  }

  _run(job: Job, context: JobRunnerContext) {
    return this.handler(job, context);
  }
}
