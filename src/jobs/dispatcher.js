import Arnavon from '../';
import promClient from 'prom-client';
import ArnavonConfig from '../config';
import JobValidator from './validator';
import { DataValidationError, inspect, UnknownJobError, InvalidBatch } from '../robust';
import Job from './job';

export default class JobDispatcher {

  /**
   * Private collection of jobs
   */
  #jobs;
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
        labelNames: ['jobName'],
        registers: [Arnavon.registry]
      }),
      invalid: new promClient.Counter({
        name: 'dispatcher_invalid_jobs',
        help: 'number of invalid jobs passing through the dispacther',
        labelNames: ['jobName'],
        registers: [Arnavon.registry]
      }),
      unknown: new promClient.Counter({
        name: 'dispatcher_unknown_jobs',
        help: 'number of unknown jobs rejected by the  dispacther',
        labelNames: ['jobName'],
        registers: [Arnavon.registry]
      })
    };
    this.#jobs = config.jobs.reduce((jobs, jobConfig) => {
      jobConfig.validator = new JobValidator(jobConfig.inputSchema);
      jobs[jobConfig.name] = jobConfig;
      return jobs;
    }, {});
  }

  dispatchBatch(jobName, data, meta = {}, options = { strict: true }) {
    if (!this.#jobs[jobName]) {
      this.#counters.unknown.inc({ jobName });
      return Promise.reject(new UnknownJobError(jobName));
    }
    const validator = this.#jobs[jobName].validator;
    if (!Array.isArray(data)) {
      return Promise.reject(new DataValidationError(`Array of payloads expected for batches, got ${inspect(data)}`));
    }

    const valids = [];
    const invalids = [];
    data.forEach((payload) => {
      try {
        valids.push(validator.validate(payload));
      } catch (err) {
        invalids.push(payload);
      }
    });

    this.#counters.invalid.inc({ jobName }, invalids.length);

    if (options.strict && invalids.length) {
      return Promise.reject(new InvalidBatch(`${invalids.length} job payloads are invalid`, invalids, valids));
    }

    this.#counters.valid.inc({ jobName }, valids.length);

    const batchId = meta.id;
    const batchMetadata = Object.assign({}, meta);
    delete batchMetadata.id;
    const jobs = valids.map((j) => new Job(j, Object.assign({}, batchMetadata, {
      batchId,
      jobName: jobName,
      dispatched: new Date()
    })));

    const promises = jobs.map(job => Arnavon.queue.push(jobName, job));

    return Promise.all(promises)
      .then(() => jobs);
  }

  getValidator(metadata) {
    if (!this.#jobs[metadata.jobName]) {
      throw new UnknownJobError(metadata.jobName);
    }
    return this.#jobs[metadata.jobName].validator;
  }

  dispatch(jobName, data, meta = {}) {
    const jobConfig = this.#jobs[jobName];
    if (!jobConfig) {
      this.#counters.unknown.inc({ jobName });
      return Promise.reject(new UnknownJobError(jobName));
    }
    const validator = jobConfig.validator;
    let jobPayload;
    try {
      jobPayload = validator.validate(data);
    } catch (err) {
      this.#counters.invalid.inc({ jobName });
      if (jobConfig.invalidJobExchange) {
        Arnavon.queue.push(jobName, data, { exchange: jobConfig.invalidJobExchange });
      }
      return Promise.reject(err);
    }

    this.#counters.valid.inc({ jobName });
    const job = new Job(jobPayload, Object.assign({}, meta, {
      jobName: jobName,
      dispatched: new Date()
    }));

    return Arnavon.queue.push(jobName, job)
      .then(() => job);
  }

}
