import ArnavonConfig from '../config';
import JobValidator from './validator';
import Queue from '../queue';

import { inspect, UnknownJobError } from '../robust';
import Job from './job';

export default class JobDispatcher {

  #validators;
  #queue;
  constructor(config, queue) {
    if (!(config instanceof ArnavonConfig)) {
      throw new Error(`ArnavonConfig expected, got ${inspect(config)}`);
    }
    if (!(queue instanceof Queue)) {
      throw new Error(`Queue expected, got ${inspect(queue)}`);
    }
    this.#queue = queue;
    this.#validators = config.jobs.reduce((validators, jobConfig) => {
      validators[jobConfig.id] = new JobValidator(jobConfig.inputSchema);
      return validators;
    }, {});
  }

  dispatch(jobId, data) {
    const validator = this.#validators[jobId];
    if (!validator) {
      return Promise.reject(new UnknownJobError(jobId));
    }
    let jobPayload;
    try {
      jobPayload = validator.validate(data);
    } catch (err) {
      return Promise.reject(err);
    }

    const job = new Job(jobPayload);
    return this.#queue.push(jobId, job);
  }

}
