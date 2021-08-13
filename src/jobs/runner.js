import Job from './job';
import { ArnavonError, inspect, InvalidRunError } from '../robust';
import promClient from 'prom-client';
import Arnavon from '../';
import mainLogger from '../logger';

/**
 * The prometheus counters are shared amongst JobRunner classes
 * but use labels to distinguish the implementating-class/job
 */
const ensureCounter = (type, name, help, extraLabels = []) => {
  let metric = Arnavon.registry.getSingleMetric(name);
  if (!metric) {
    metric = new type({
      name,
      help,
      labelNames: ['jobName'].concat(extraLabels),
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

  static MODES = {
    ARNAVON: 'arnavon',
    RAW: 'raw'
  };
  static DEFAULT_MODE = 'arnavon';

  #mode;
  constructor(config = {}) {
    this.#mode = config.mode || JobRunner.DEFAULT_MODE;
    JobRunner.ensureMetrics();
  }

  static ensureMetrics() {
    JobRunner.metrics = JobRunner.metrics || {};
    JobRunner.metrics.success = ensureCounter(promClient.Counter, 'runner_successful_jobs', 'number of successful job runs');
    JobRunner.metrics.failures = ensureCounter(promClient.Counter, 'runner_failed_jobs', 'number of failed job runs');
    JobRunner.metrics.leadTime = ensureCounter(
      promClient.Histogram,
      'runner_job_lead_time',
      'time spent between queueing and end of job execution',
      ['success']);
    JobRunner.metrics.touchTime = ensureCounter(
      promClient.Histogram,
      'runner_job_touch_time',
      'time spent on job execution',
      ['success']);
  }

  /**
   * Runs a job
   * @param {Job} job
   */
  run(message, context = {}) {
    context.logger = context.logger ? context.logger : mainLogger;
    switch (this.#mode) {
    case JobRunner.MODES.ARNAVON:
      return this.#run_arnavon(message, context);
    case JobRunner.MODES.RAW:
      return this.#run_raw(message, context);
    default:
      throw new ArnavonError(`Invalid mode ${this.#mode}`);
    }
  }

  #run_arnavon(message, context) {
    // Convert it back to a job instance
    const job = Job.fromJSON(message);

    const dispatchedTime = job.meta.dispatched;
    const dequeuedTime = job.meta.dequeued || new Date();

    const updateMetrics = (err = null) => {
      const leadTime = ((new Date()) - dispatchedTime) / 1000;
      const touchTime = ((new Date()) - dequeuedTime) / 1000;
      if (err) {
        JobRunner.metrics.failures.inc({ jobName: job.meta.jobName });
      } else {
        JobRunner.metrics.success.inc({ jobName: job.meta.jobName });
      }
      JobRunner.metrics.leadTime.observe({ jobName: job.meta.jobName, success: !err }, leadTime);
      JobRunner.metrics.touchTime.observe({ jobName: job.meta.jobName, success: !err }, touchTime);
    };

    return this.#doRun(job, context, updateMetrics);
  }

  #run_raw(message, context) {
    return this.#doRun(message, context);
  }

  #doRun(message, context, updateMetrics = () => {}) {
    let result;
    try {
      context.logger.info(`Running runner implementation ${this.constructor.name}`);
      result = this._run(message, context);
    } catch (err) {
      context.logger.error(err, `${this.constructor.name} Runner failed`);
      updateMetrics(err);
      return Promise.reject(err);
    }

    if (!(result instanceof Promise)) {
      const error = new InvalidRunError(`The ${this.constructor.name} runner didn't return a Promise. Got ${inspect(result)}`);
      context.logger.error(error, `${this.constructor.name} Runner failed`);
      updateMetrics(error);
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
  _run(/* job */) {
    throw new Error('#_run should be implemented by subclasses');
  }

  static factor(type, config) {
    // circular dependency... no choice :(
    const runners = require('./runners').default;
    return runners.factor(type, config);
  }

}
