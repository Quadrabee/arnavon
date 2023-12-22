import Queue, { QueueInternalProcessor } from '../index';

export type MemoryQueueConfig = unknown;

class MemoryQueue extends Queue {

  #queue: Array<{ key: string, data: unknown }>;
  constructor() {
    super();
    this.#queue = [];
  }

  _connect() {
    return Promise.resolve(this);
  }

  _push(key: string, data: unknown) {
    this.#queue.push({ key, data });
    return Promise.resolve();
  }

  _consume(selector: string, processor: QueueInternalProcessor) {
    while (this.#queue.length) {
      const { key, data } = this.#queue.shift();
      // @ts-expect-error refactor
      processor(key, data);
    }
  }

}

export default MemoryQueue;
