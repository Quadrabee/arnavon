import Job from './job';
import { inspect } from '../robust';
import runners from './runners';
import promClient from 'prom-client';
import Arnavon from '../';

/**
 * The prometheus counters are shared amongst JobRunner classes
 * but use labels to distinguist the implementating-class/job
 */

/**
 * Abstract class JobRunner
 * Is inherited by subclasses to provide different kind of runners
 * for instance: nodejs, binary, ...
 */
export default class JobRunner {

  /**
   * Private collection of counters (unknown/invalid/valid jobs)
   */
  #counters;

  constructor() {
    this.#counters = {
      success: new promClient.Counter({
        name: 'runner_successful_jobs',
        help: 'number of successful job runs',
        registers: [Arnavon.registry]
      }),
      failures: new promClient.Counter({
        name: 'runner_failed_jobs',
        help: 'number of failed job runs',
        registers: [Arnavon.registry]
      })
    };
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
      this.#counters.failures.inc();
      return Promise.reject(err);
    }

    if (result instanceof Promise) {
      return result
        .then((result) => {
          this.#counters.success.inc();
          return result;
        });
    }

    this.#counters.success.inc();
    return Promise.resolve(result);
  }

  /**
   * Implementation specific, should be implemented by subclasses
   * @param {Job} job
   */
  _run(job) {
    throw new Error('#_run should be implemented by subclasses');
  }

  static factor(type, config) {
    return runners.factor(type, config);
  }

}
