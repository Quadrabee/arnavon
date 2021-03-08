import Job from './job';
import { inspect } from '../robust';
import promClient from 'prom-client';
import Arnavon from '../';
import mainLogger from '../logger';

/**
 * The prometheus counters are shared amongst JobRunner classes
 * but use labels to distinguish the implementating-class/job
 */
const ensureCounter = (type, name, help) => {
  let metric = Arnavon.registry.getSingleMetric(name);
  if (!metric) {
    metric = new type({
      name,
      help,
      labelNames: ['jobName'],
      registers: [Arnavon.registry]
    });
  }
  return metric;
};

/**
 * Abstract class JobRunner
 * Is inherited by subclasses to provide different kind of runners
 * for instance: nodejs, binary, ...
 */
export default class JobRunner {

  constructor() {
    JobRunner.ensureMetrics();
  }

  static ensureMetrics() {
    JobRunner.metrics = JobRunner.metrics || {};
    JobRunner.metrics.success = ensureCounter(promClient.Counter, 'runner_successful_jobs', 'number of successful job runs');
    JobRunner.metrics.failures = ensureCounter(promClient.Counter, 'runner_failed_jobs', 'number of failed job runs');
    JobRunner.metrics.runTime = ensureCounter(promClient.Histogram, 'runner_job_run_time', 'time spent running jobs');
  }

  /**
   * Runs a job
   * @param {Job} job
   */
  run(job, context = {}) {
    context.logger = context.logger ? context.logger : mainLogger;

    if (!(job instanceof Job)) {
      context.logger.error(`Job expected, got ${inspect(job)}`);
      throw new Error(`Job expected, got ${inspect(job)}`);
    }

    const startTime = (job.meta && job.meta.dequeued) ? job.meta.dequeued : new Date();

    let result;
    try {
      context.logger.info(`Running runner implementation ${this.constructor.name}`);
      result = this._run(job, context);
    } catch (err) {
      const elapsed = (new Date()) - startTime;
      context.logger.error(err, 'Runner failed');
      JobRunner.metrics.failures.inc();
      JobRunner.metrics.runTime.observe(elapsed, { jobName: job.meta.jobName, success: false });
      return Promise.reject(err);
    }

    if (result instanceof Promise) {
      context.logger.info(`Promise detected as result from ${this.constructor.name}`);
      return result
        .then((result) => {
          const elapsed = (new Date()) - startTime;
          context.logger.info({ result }, 'Promise succeeded');
          JobRunner.metrics.success.inc({ jobName: job.meta.jobName });
          JobRunner.metrics.runTime.observe(elapsed, { jobName: job.meta.jobName, success: true });
          return result;
        })
        .catch((err) => {
          const elapsed = (new Date()) - startTime;
          context.logger.error(err, 'Promise failed');
          JobRunner.metrics.failures.inc({ jobName: job.meta.jobName });
          JobRunner.metrics.runTime.observe(elapsed, { jobName: job.meta.jobName, success: false });
          throw err;
        });
    }

    const elapsed = (new Date()) - startTime;
    context.logger.info({ result }, `Non-promise detected as result from ${this.constructor.name}`);
    JobRunner.metrics.runTime.observe(elapsed, { jobName: job.meta.jobName, success: false });
    JobRunner.metrics.success.inc({ jobName: job.meta.jobName });
    return Promise.resolve(result);
  }

  /**
   * Implementation specific, should be implemented by subclasses
   * @param {Job} job
   */
  _run(/* job */) {
    throw new Error('#_run should be implemented by subclasses');
  }

  static factor(type, config) {
    // circular dependency... no choice :(
    const runners = require('./runners').default;
    return runners.factor(type, config);
  }

}
