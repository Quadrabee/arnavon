import Job from './job';

export default class JobValidator {

  constructor(jobDef) {

  }

  validate(payload) {
    return new Job(payload);
  }

}
