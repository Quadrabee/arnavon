import Config from '../config';
import JobValidator from './validator';
import { inspect } from '../robust';
import Job from './job';

export default class JobDispatcher {

  #validators;
  constructor(config) {
    if (!(config instanceof Config)) {
      throw new Error(`Config expected, got ${inspect(config)}`);
    }
    this.#validators = config.jobs.reduce((validators, jobConfig) => {
      validators[jobConfig.id] = new JobValidator(jobConfig.inputSchema);
      return validators;
    }, {});
  }

  dispatch(jobId, data) {
    const validator = this.#validators[jobId];
    if (!validator) {
      return Promise.reject(new Error(`Invalid job ID: ${jobId}. No definition found`));
    }
    let jobPayload;
    try {
      jobPayload = validator.validate(data);
    } catch (err) {
      return Promise.reject(err);
    }
    const job = new Job(jobPayload);
  }

}
