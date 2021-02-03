import JobValidator from './validator';
import { AWFMError } from '../robust';

export default class JobProcessor {

  #jobs;
  #queue;
  #validators;
  constructor({ jobs }, queue) {
    this.#jobs = jobs;
    this.#queue = queue;
    this.#validators = jobs.reduce((validators, jobDef) => {
      validators[jobDef.id] = new JobValidator(jobDef);
      return validators;
    }, {});
  }

  schedule(jobId, jobPayload) {
    const validator = this.#validators[jobId];
    if (!validator) {
      throw new AWFMError(`No definition found for job id: ${jobId}`);
    }
    const job = validator.validate(jobPayload);
    return this.#queue.push(jobId, job);
  }

}
