import Arnavon from '../';
import promClient from 'prom-client';
import ArnavonConfig from '../config';
import JobValidator from './validator';
import Queue from '../queue';
import { inspect, UnknownJobError } from '../robust';
import Job from './job';

export default class JobDispatcher {

  /**
   * Private collection of job validators
   */
  #validators;
  /**
   * The actual queue (driver) used to enqueue valid jobs
   */
  #queue;
  /**
   * Private collection of counters (unknown/invalid/valid jobs)
   */
  #counters;

  /**
   * Constructs a new JobDispatcher
   * @param {ArnavonConfig} config a valid config object
   * @param {*} queue an instance of Queue that will be used to enqueue jobs
   */
  constructor(config, queue) {
    if (!(config instanceof ArnavonConfig)) {
      throw new Error(`ArnavonConfig expected, got ${inspect(config)}`);
    }
    if (!(queue instanceof Queue)) {
      throw new Error(`Queue expected, got ${inspect(queue)}`);
    }

    this.#counters = {
      valid: new promClient.Counter({
        name: 'dispatcher_valid_jobs',
        help: 'number of valid jobs passing through the dispacther',
        registers: [Arnavon.registry]
      }),
      invalid: new promClient.Counter({
        name: 'dispatcher_invalid_jobs',
        help: 'number of invalid jobs passing through the dispacther',
        registers: [Arnavon.registry]
      }),
      unknown: new promClient.Counter({
        name: 'dispatcher_unknown_jobs',
        help: 'number of unknown jobs rejected by the  dispacther',
        registers: [Arnavon.registry]
      })
    };
    this.#queue = queue;
    this.#validators = config.jobs.reduce((validators, jobConfig) => {
      validators[jobConfig.id] = new JobValidator(jobConfig.inputSchema);
      return validators;
    }, {});
  }

  dispatch(jobId, data, meta = {}) {
    const validator = this.#validators[jobId];
    if (!validator) {
      this.#counters.unknown.inc();
      return Promise.reject(new UnknownJobError(jobId));
    }
    let jobPayload;
    try {
      jobPayload = validator.validate(data);
    } catch (err) {
      this.#counters.invalid.inc();
      return Promise.reject(err);
    }

    this.#counters.valid.inc();
    const job = new Job(jobPayload, Object.assign({}, meta, {
      jobId: jobId,
      dispatched: new Date()
    }));
    return this.#queue.push(jobId, job);
  }

}
