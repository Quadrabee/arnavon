import Job from './job';
import { inspect } from '../robust';
import runners from './runners';

/**
 * Abstract class JobRunner
 * Is inherited by subclasses to provide different kind of runners
 * for instance: nodejs, binary, ...
 */
export default class JobRunner {

  /**
   * Runs a job
   * @param {Job} job
   */
  run(job) {
    if (!(job instanceof Job)) {
      throw new Error(`Job expected, got ${inspect(job)}`);
    }

    const result = this._run(job);

    if (result instanceof Promise) {
      return result;
    }

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
