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

  toJSON() {
    return {
      ...this
    };
  }
}
