import Queue, { QueueInternalProcessor, RequeueOptions, RequeueResult } from '../index';
import Job from '../../jobs/job';

export type MemoryQueueConfig = unknown;

class MemoryQueue extends Queue {

  #queues: Map<string, Array<{ key: string, data: Job }>>;
  #queue: Array<{ key: string, data: Job }>;
  constructor() {
    super();
    this.#queue = [];
    this.#queues = new Map();
  }

  // Get or create a named queue
  #getQueue(name: string): Array<{ key: string, data: Job }> {
    if (!this.#queues.has(name)) {
      this.#queues.set(name, []);
    }
    return this.#queues.get(name)!;
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

  async _requeue(sourceQueue: string, options: RequeueOptions): Promise<RequeueResult> {
    const source = this.#getQueue(sourceQueue);
    const destination = this.#getQueue(options.destinationQueue);
    const maxMessages = options.count;
    let requeued = 0;

    while (source.length > 0 && (maxMessages === undefined || requeued < maxMessages)) {
      const item = source.shift();
      if (item) {
        destination.push(item);
        requeued++;
      }
    }

    // MemoryQueue is synchronous, so we return 'completed' status
    return { status: 'completed', requeued, failed: 0, errors: [] };
  }

  // Helper method to push to a named queue (for testing DLQ scenarios)
  pushToQueue(queueName: string, key: string, data: Job): void {
    this.#getQueue(queueName).push({ key, data });
  }

  // Helper method to get queue length (for testing)
  getQueueLength(queueName?: string): number {
    if (queueName) {
      return this.#getQueue(queueName).length;
    }
    return this.#queue.length;
  }

}

export default MemoryQueue;
