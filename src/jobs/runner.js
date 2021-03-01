import Job from './job';
import { inspect } from '../robust';
import promClient from 'prom-client';
import Arnavon from '../';

/**
 * The prometheus counters are shared amongst JobRunner classes
 * but use labels to distinguish the implementating-class/job
 */
const ensureCounter = (name, help) => {
  let metric = Arnavon.registry.getSingleMetric(name);
  if (!metric) {
    metric = new promClient.Counter({
      name,
      help,
      labelNames: ['jobId'],
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
    JobRunner.metrics.success = ensureCounter('runner_successful_jobs', 'number of successful job runs');
    JobRunner.metrics.failures = ensureCounter('runner_failed_jobs', 'number of failed job runs');
  }

  /**
   * Runs a job
   * @param {Job} job
   */
  run(job) {
    if (!(job instanceof Job)) {
      throw new Error(`Job expected, got ${inspect(job)}`);
    }

    let result;
    try {
      result = this._run(job);
    } catch (err) {
      JobRunner.metrics.failures.inc();
      return Promise.reject(err);
    }

    if (result instanceof Promise) {
      return result
        .then((result) => {
          JobRunner.metrics.success.inc({ jobId: job.meta.jobId });
          return result;
        })
        .catch((err) => {
          JobRunner.metrics.failures.inc({ jobId: job.meta.jobId });
          throw err;
        });
    }

    JobRunner.metrics.success.inc({ jobId: job.meta.jobId });
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
