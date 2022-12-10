import Job, { JobMeta } from './job';
import { ArnavonError, inspect, InvalidRunError } from '../robust';
import promClient, { Counter, Histogram, Metric } from 'prom-client';
import Arnavon from '../';
import mainLogger from '../logger';
import Logger from 'bunyan';

/**
 * The prometheus counters are shared amongst JobRunner classes
 * but use labels to distinguish the implementating-class/job
 */
const ensureCounter = <T extends Metric<any>>(type: new(params: any) => T, name: string, help: string, extraLabels: string[] = []): T => {
  let metric = Arnavon.registry.getSingleMetric(name);
  if (!metric) {
    metric = new type({
      name,
      help,
      labelNames: ['jobName'].concat(extraLabels),
      registers: [Arnavon.registry],
    });
  }
  return metric as T;
};

export enum Mode {
  ARNAVON = 'arnavon',
  RAW = 'raw',
}

export type JobRunnerConfig = {
  type: string
  mode?: Mode,
  config: any
}

export type JobRunnerMetricCollection = {
  success?: Counter<any>,
  failures?: Counter<any>,
  leadTime?: Histogram<any>,
  touchTime?: Histogram<any>,
}

export type JobRunnerContext = {
  logger: Logger,
  metadata: JobMeta
}

/**
 * Abstract class JobRunner
 * Is inherited by subclasses to provide different kind of runners
 * for instance: nodejs, binary, ...
 */
export default class JobRunner {

  protected static metrics: JobRunnerMetricCollection;
  public readonly mode: Mode;
  constructor(config: Partial<JobRunnerConfig> = {}) {
    this.mode = config.mode || Mode.ARNAVON;
    JobRunner.ensureMetrics();
  }

  static ensureMetrics() {
    JobRunner.metrics = JobRunner.metrics || {};
    JobRunner.metrics.success = ensureCounter(
      promClient.Counter,
      'runner_successful_jobs',
      'number of successful job runs',
    );
    JobRunner.metrics.failures = ensureCounter(
      promClient.Counter,
      'runner_failed_jobs',
      'number of failed job runs',
    );
    JobRunner.metrics.leadTime = ensureCounter(
      promClient.Histogram,
      'runner_job_lead_time',
      'time spent between queueing and end of job execution',
      ['success'],
    );
    JobRunner.metrics.touchTime = ensureCounter(
      promClient.Histogram,
      'runner_job_touch_time',
      'time spent on job execution',
      ['success'],
    );
  }

  /**
   * Runs a job
   * @param {Job} job
   */
  run(message: any, context: Partial<JobRunnerContext> = {}) {
    context.logger = context.logger ? context.logger : mainLogger;
    switch (this.mode) {
    case Mode.ARNAVON:
      return this.#run_arnavon(message, context as JobRunnerContext);
    case Mode.RAW:
      return this.#run_raw(message, context as JobRunnerContext);
    default:
      throw new ArnavonError(`Invalid mode ${this.mode}`);
    }
  }

  #run_arnavon(message: any, context: JobRunnerContext) {
    // Convert it back to a job instance
    const job = Job.fromJSON(message);

    const dispatchedTime = job.meta.dispatched as Date;
    const dequeuedTime = job.meta.dequeued || new Date();

    const updateMetrics = (err?: Error) => {
      const leadTime = ((new Date()).getTime() - dispatchedTime.getTime()) / 1000;
      const touchTime = ((new Date()).getTime() - dequeuedTime.getTime()) / 1000;
      if (err) {
        JobRunner.metrics.failures.inc({ jobName: job.meta.jobName });
      } else {
        JobRunner.metrics.success.inc({ jobName: job.meta.jobName });
      }
      JobRunner.metrics.leadTime.observe({ jobName: job.meta.jobName, success: (!err).toString() }, leadTime);
      JobRunner.metrics.touchTime.observe({ jobName: job.meta.jobName, success: (!err).toString() }, touchTime);
    };

    return this.#doRun(job, context, updateMetrics);
  }

  #run_raw(message: any, context: JobRunnerContext) {
    return this.#doRun(message, context);
  }

  #doRun(message: any, context: JobRunnerContext, updateMetrics?: (err?: Error) => any) {
    let result: any;
    try {
      context.logger.info(`Running runner implementation ${this.constructor.name}`);
      result = this._run(message, context);
    } catch (err: any) {
      context.logger.error(err, `${this.constructor.name} Runner failed`);
      if (updateMetrics) {
        updateMetrics(err);
      }
      return Promise.reject(err);
    }

    if (!(result instanceof Promise)) {
      const error = new InvalidRunError(`The ${this.constructor.name} runner didn't return a Promise. Got ${inspect(result)}`);
      context.logger.error(error, `${this.constructor.name} Runner failed`);
      if (updateMetrics) {
        updateMetrics(error);
      }
      return Promise.reject(error);
    }

    return result
      .then((result) => {
        context.logger.info({ result }, `${this.constructor.name} run succeeded`);
        updateMetrics();
        return result;
      })
      .catch((err) => {
        context.logger.error(err, `${this.constructor.name} Runner failed`);
        updateMetrics(err);
        throw err;
      });
  }

  /**
   * Implementation specific, should be implemented by subclasses
   * @param {Job} job
   */
  _run(message: any, context: JobRunnerContext) {
    throw new Error('#_run should be implemented by subclasses');
  }

  static factor(type: string, config: JobRunnerConfig) {
    // circular dependency... no choice :(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runners = require('./runners').default;
    return runners.factor(type, config);
  }

}
