import { v4 as uuid, validate } from 'uuid';
import { inspect } from '../robust';
import JobPayload from './payload';

export interface JobMeta {
  id?: string
  jobName?: string
  dispatched?: Date
  dequeued?: Date
}

export default class Job {

  constructor(public readonly payload: JobPayload, public readonly meta: JobMeta = {}) {
    if (!(meta instanceof Object)) {
      throw new Error(`Invalid meta: Object expected, got ${inspect(meta)}`);
    }
    if (meta.id && !validate(meta.id)) {
      throw new Error(`Invalid ID: uuid expected, got ${inspect(meta.id)}`);
    }

    meta.id = meta.id || uuid();

    Object.defineProperties(this, {
      payload: {
        writable: false,
        value: payload,
      },
      meta: {
        writable: false,
        value: meta,
      },
    });
  }

  toString() {
    return {
      meta: this.meta,
      payload: `{${Object.keys(this.payload).join(', ')}}`,
    };
  }

  static fromJSON(_job: Job) {
    // TODO: dress with finitio
    const job = new Job(_job.payload, _job.meta);
    if (job.meta && job.meta.dispatched) {
      job.meta.dispatched = new Date(job.meta.dispatched);
    }
    return job;
  }

  toJSON() {
    return {
      meta: this.meta,
      payload: this.payload,
    };
  }
}
