import Arnavon from '../';
import promClient from 'prom-client';
import ArnavonConfig from '../config';
import JobValidator from './validator';
import { inspect, UnknownJobError } from '../robust';
import Job from './job';

export default class JobDispatcher {

  /**
   * Private collection of job validators
   */
  #validators;
  /**
   * Private collection of counters (unknown/invalid/valid jobs)
   */
  #counters;

  /**
   * Constructs a new JobDispatcher
   * @param {ArnavonConfig} config a valid config object
   */
  constructor(config) {
    if (!(config instanceof ArnavonConfig)) {
      throw new Error(`ArnavonConfig expected, got ${inspect(config)}`);
    }

    this.#counters = {
      valid: new promClient.Counter({
        name: 'dispatcher_valid_jobs',
        help: 'number of valid jobs passing through the dispacther',
        labelNames: ['jobId'],
        registers: [Arnavon.registry]
      }),
      invalid: new promClient.Counter({
        name: 'dispatcher_invalid_jobs',
        help: 'number of invalid jobs passing through the dispacther',
        labelNames: ['jobId'],
        registers: [Arnavon.registry]
      }),
      unknown: new promClient.Counter({
        name: 'dispatcher_unknown_jobs',
        help: 'number of unknown jobs rejected by the  dispacther',
        labelNames: ['jobId'],
        registers: [Arnavon.registry]
      })
    };
    this.#validators = config.jobs.reduce((validators, jobConfig) => {
      validators[jobConfig.id] = new JobValidator(jobConfig.inputSchema);
      return validators;
    }, {});
  }

  dispatch(jobId, data, meta = {}) {
    const validator = this.#validators[jobId];
    if (!validator) {
      this.#counters.unknown.inc({ jobId });
      return Promise.reject(new UnknownJobError(jobId));
    }
    let jobPayload;
    try {
      jobPayload = validator.validate(data);
    } catch (err) {
      this.#counters.invalid.inc({ jobId });
      return Promise.reject(err);
    }

    this.#counters.valid.inc({ jobId });
    const job = new Job(jobPayload, Object.assign({}, meta, {
      jobId: jobId,
      dispatched: new Date()
    }));

    return Arnavon.queue.push(jobId, job)
      .then(() => job);
  }

}
