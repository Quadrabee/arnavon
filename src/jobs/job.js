import { v4 as uuid, validate } from 'uuid';
import { inspect } from '../robust';

export default class Job {
  constructor(payload, meta = {}) {
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
        value: payload
      },
      meta: {
        writable: false,
        value: meta
      }
    });
  }

  toString() {
    return {
      meta: this.meta,
      payload: `{${Object.keys(this.payload).join(', ')}}`
    };
  }

  static fromJSON(_job) {
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
      payload: this.payload
    };
  }
}
