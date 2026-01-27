import EventEmitter from 'events';
import Job, { JobMeta } from '../jobs/job';
import { JobRunnerContext } from '../jobs/runner';
import logger from '../logger';
import { inspect } from '../robust';
import { QueueDriverConfig } from './drivers';

export interface QueueConfig {
  driver: string,
  config: QueueDriverConfig
}

export type RequeueOptions = {
  count?: number; // Number of messages to requeue (undefined = all)
  destinationQueue: string; // Target queue to move messages to
}

export type RequeueResult = {
  status: 'initiated' | 'completed';
  requeued: number;
  failed: number;
  errors: Array<{ error: string }>;
}

export type QueueProcessor = (job: Job, context: JobRunnerContext) => Promise<unknown>
export type QueueInternalProcessor = (job: Job, metadata: JobMeta) => Promise<unknown>

/**
 * Queue subclasses are supposed to properly emit the following events:
 *   - close (when the connection is closed)
 *   - error (if the connection closes)
 */
class Queue extends EventEmitter {

  static create(config: QueueConfig): Queue {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const drivers = require('./drivers').default;
    const { driver, config: driverConfig } = config;
    if (!drivers[driver]) {
      throw new Error(`Unknown queue driver: ${driver}`);
    }
    return new drivers[driver](driverConfig);
  }

  // subclasses should implement _connect()
  connect(): Promise<Queue> {
    logger.info(`${this.constructor.name} - Connecting to queue`);
    return this._connect().then((res) => {
      logger.info(`${this.constructor.name} - Connected`);
      return res;
    });
  }

  // subclasses should implement _connect()
  disconnect(): Promise<Queue> {
    logger.info(`${this.constructor.name} - Disconnecting from queue`);
    return this._disconnect().then((res) => {
      logger.info(`${this.constructor.name} - Disconnected`);
      return res;
    });
  }

  // subclasses should implement _push(key, data)
  push(key: string, data: unknown, opts = {}): Promise<unknown> {
    logger.info(`${this.constructor.name} - Pushing to queue`, key, data);

    return this._push(key, data, opts).then((job) => {
      logger.info(`${this.constructor.name} - Pushed`);
      return job;
    });
  }

  // subclasses should implement _consumer(processor)
  consume(queueName: string, processor: QueueProcessor) {
    if (typeof queueName !== 'string') {
      throw new Error(`String selector expected, got ${inspect(queueName)}`);
    }
    if (!(processor instanceof Function)) {
      throw new Error(`Consumer callback expected, got ${inspect(processor)}`);
    }
    logger.info(`${this.constructor.name} - Starting consumption of queue ${queueName}`);
    return this._consume(queueName, (job, metadata) => {
      const childLogger = logger.child({ jobId: job.meta ? job.meta.id : null }, true);
      // set dequeue time
      if (job.meta) {
        job.meta.dequeued = new Date();
      }
      childLogger.info({ job: { meta: job.meta } }, `${this.constructor.name} - Consuming job`);
      return processor(job, { logger: childLogger, metadata });
    });
  }

  // subclasses should implement _requeue(sourceQueue, options)
  requeue(sourceQueue: string, options: RequeueOptions): Promise<RequeueResult> {
    if (typeof sourceQueue !== 'string') {
      throw new Error(`String queue name expected, got ${inspect(sourceQueue)}`);
    }
    if (typeof options?.destinationQueue !== 'string') {
      throw new Error(`String destinationQueue expected, got ${inspect(options?.destinationQueue)}`);
    }
    logger.info(`${this.constructor.name} - Requeuing messages from ${sourceQueue} to ${options.destinationQueue}`, options);
    return this._requeue(sourceQueue, options).then((result) => {
      logger.info(`${this.constructor.name} - Requeue complete`, result);
      return result;
    });
  }

  // To be implemented by subclasses
  _consume(_queueName: string, _processor: QueueInternalProcessor) {
    throw new Error('NotImplemented');
  }

  _connect(): Promise<Queue> {
    throw new Error('NotImplemented');
  }

  _disconnect(): Promise<Queue> {
    throw new Error('NotImplemented');
  }

  _push(key: string, data: unknown, _opts = {}): Promise<unknown> {
    throw new Error('NotImplemented');
  }

  _requeue(_sourceQueue: string, _options: RequeueOptions): Promise<RequeueResult> {
    throw new Error('NotImplemented');
  }

}

export default Queue;
