import Queue, { QueueInternalProcessor } from '../index';
import Job from '../../jobs/job';

export type MemoryQueueConfig = unknown;

class MemoryQueue extends Queue {

  #queue: Array<{ key: string, data: Job }>;
  constructor() {
    super();
    this.#queue = [];
  }

  _connect() {
    return Promise.resolve(this);
  }

  _disconnect() {
    return Promise.resolve(this);
  }

  _push(key: string, data: unknown) {
    this.#queue.push({ key, data: data as Job });
    return Promise.resolve();
  }

  async _consume(selector: string, processor: QueueInternalProcessor) {
    while (this.#queue.length) {
      const item = this.#queue.shift();
      if (item) {
        const { key, data } = item;
        await processor(data, { jobName: key });
      }
    }
  }

}

export default MemoryQueue;
