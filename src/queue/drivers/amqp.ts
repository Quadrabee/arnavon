import Queue, { QueueInternalProcessor } from '../index';
import amqplib, { ConfirmChannel } from 'amqplib';
import logger from '../../logger';
import { JobMeta } from '../../jobs/job';

export type AMQPQueueBinding = {
  exchange: string,
  routingKey: string
}

export type AMQPQueue = {
  name: string,
  options?: {
    durable ?: boolean,
    deadLetterExchange ?: string
    deadLetterRoutingKey ?: string
  }
  bindings?: [AMQPQueueBinding]
}

export type AMQPExchangeType = 'topic' | 'direct' | 'fanout';

export type AMQPExchange = {
  name : string,
  type ?: AMQPExchangeType,
  default ?: boolean,
  options ?: {
    durable: boolean
  }
}

export type AMQPTopology = {
  exchanges: Array<AMQPExchange>
  queues: Array<AMQPQueue>
}

export type AMQPQueueConfig = {
  url ?: string,
  connectRetries ?: number,
  prefetchCount ?: number
  topology: AMQPTopology
}

export type AQMPPushOptions = {
  exchange: string
  headers?: Record<string, unknown>
}

class AmqpQueue extends Queue {

  protected url: string;
  #conn?: amqplib.ChannelModel;
  #channel?: amqplib.ConfirmChannel;
  #exchange;
  #topology;
  #connectRetries;
  #prefetchCount;
  #disconnecting ?: boolean;

  constructor(params: AMQPQueueConfig) {
    super();

    if (!(process.env.AMQP_URL || params.url)) {
      throw new Error('AMQP: url parameter required');
    }
    this.url = process.env.AMQP_URL || params.url as string;
    this.#connectRetries = params.connectRetries || 10;
    this.#prefetchCount = params.prefetchCount || 1;
    this.#topology = params.topology;
    // Which is our default exchange (only can have one)
    const defaultExchanges = params.topology.exchanges.filter(ex => ex.default === true);
    if (defaultExchanges.length === 0) {
      throw new Error('AmqpQueue: one exchange must be set as default');
    }
    if (defaultExchanges.length > 1) {
      throw new Error('AmqpQueue: only one exchange can be set as default');
    }

    this.#exchange = defaultExchanges[0].name;
  }

  _installTopology() {
    if (!this.#channel) {
      throw new Error('Cannot install topology, no channel found');
    }
    const createExchanges = () => {
      const promises = this.#topology.exchanges.map((ex) => {
        return (this.#channel as amqplib.ConfirmChannel)
          .assertExchange(ex.name, ex.type || 'fanout', ex.options);
      });
      return Promise.all(promises);
    };
    const createQueues = () => {
      const promises = this.#topology.queues.map((q) => {
        return (this.#channel as amqplib.ConfirmChannel)
          .assertQueue(q.name, q.options);
      });
      return Promise.all(promises);
    };
    const createBindings = () => {
      const promises: Array<Promise<unknown>> = [];
      this.#topology.queues.forEach((q) => {
        const bindings = q.bindings || [];
        const bindingPromises = bindings.map((binding) => {
          return (this.#channel as amqplib.ConfirmChannel)
            .bindQueue(q.name, binding.exchange, binding.routingKey);
        });
        promises.concat(bindingPromises as Array<Promise<unknown>>);
      });
      return Promise.all(promises);
    };
    return createExchanges()
      .then(createQueues)
      .then(createBindings);
  }

  _connectWithRetries(attemptsLeft: number, waitTime = 10): Promise<amqplib.ChannelModel> {
    return amqplib
    // Connect
      .connect(this.url)
      .catch((err) => {
        if (this.#disconnecting) {
          throw new Error('Connection canceled');
        }
        if (attemptsLeft <= 0) {
          logger.error('Unable to connect to rabbitmq... Giving up.');
          throw err;
        }
        logger.warn(`Unable to connect to rabbitmq. ${attemptsLeft} attempts left. Trying again in ${waitTime}ms`);
        return new Promise((resolve) => {
          setTimeout(() => {
            // double the reconnect delay every time it fails
            resolve(this._connectWithRetries(attemptsLeft - 1, waitTime * 2));
          }, waitTime);
        });
      });
  }

  _connect() {
    return this._connectWithRetries(this.#connectRetries)
      .then(conn => {
        this.#conn = conn;
        // Propagate errors
        this.#conn.on('close', (err: Error) => {
          logger.error('Connection to queue closed', { err });
          this.emit('close', err);
        });
        this.#conn.on('error', (err: Error) => {
          logger.error('Connection error', { err });
          this.emit('error', err);
        });
        // Create channel
        return conn.createConfirmChannel();
      })
      .then((channel) => {
        channel.prefetch(this.#prefetchCount);
        this.#channel = channel;
        // Install topology
        // Propagate errors
        this.#channel.on('close', (err: Error) => {
          logger.error('Channel closed', err);
          this.emit('close', err);
        });
        this.#channel.on('error', (err: Error) => {
          logger.error('Channel error', err);
          this.emit('error', err);
        });
        // Ensure topology exists
        return this._installTopology();
      })
      .then(() => this)
      .catch((err) => {
        this.emit('error', err);
        return this;
      });
  }

  async _disconnect() {
    if (this.#conn) {
      this.#disconnecting = true;
      await this.#conn.close();
    }
    return this;
  }

  _push(key: string, data: unknown, { exchange, headers }: AQMPPushOptions) {
    if (!this.#channel) {
      throw new Error('Cannot push, no channel found');
    }
    const payload = Buffer.from(JSON.stringify(data));
    const options = { persistent: true, headers };

    return new Promise((resolve, reject) => {
      return (this.#channel as amqplib.ConfirmChannel)
        .publish(exchange || this.#exchange, key, payload, options, (err) => {
          if (err) {
            return reject(err);
          }
          return resolve(data);
        });
    });
  }

  _consume(queueName: string, processor: QueueInternalProcessor) {
    if (!this.#channel) {
      throw new Error('Cannot push, no channel found');
    }
    const channel = this.#channel as ConfirmChannel;
    return channel.consume(queueName, (msg) => {
      // AMQP informs us that the consumption is over (are we quitting, for instance?)
      if (msg === null) {
        logger.info(`${this.constructor.name}: AMQP informs consumption is over`);
        return;
      }
      let payload;
      let metadata;
      try {
        payload = JSON.parse(msg.content.toString());
        metadata = {
          ...msg.fields,
        };
      } catch (error) {
        // TODO expose that kind of error to monitoring
        logger.error(error, `${this.constructor.name}: Incorrect payload, invalid json`);
        // Nack with allUpTo=false & requeue=false
        return channel.nack(msg, false, false);
      }
      processor(payload, metadata as JobMeta)
        .then(() => {
          logger.info(`${this.constructor.name}: Acking item consumption`);
          channel.ack(msg);
        })
        .catch((err: Error) => {
          logger.error(err, `${this.constructor.name}: NAcking(!) item consumption`);
          // Nack with requeue=false
          return channel.reject(msg, false);
        });
    })
      .catch((err) => this.emit('error', err));
  }

}

export default AmqpQueue;
