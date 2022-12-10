import Queue, { QueueInternalProcessor } from '../index';

export type MemoryQueueConfig = any;

class MemoryQueue extends Queue {

  #queue: Array<any>;
  constructor() {
    super();
    this.#queue = [];
  }

  _connect() {
    return Promise.resolve(this);
  }

  _push(key: string, data: any) {
    this.#queue.push({ key, data });
    return Promise.resolve();
  }

  _consume(selector: string, processor: QueueInternalProcessor) {
    while (this.#queue.length) {
      const { key, data } = this.#queue.shift();
      processor(key, data);
    }
  }

}

export default MemoryQueue;
