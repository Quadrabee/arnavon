import Queue, { QueueInternalProcessor, QueueInfo, RequeueOptions, RequeueResult } from '../index';
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
  #managementUrl: string;
  #managementAuth: string;
  #vhost: string;
  #amqpUri: string;
  #conn?: amqplib.ChannelModel;
  #channel?: amqplib.ConfirmChannel;
  #exchange;
  #topology;
  #connectRetries;
  #prefetchCount;
  #disconnecting ?: boolean;

  /**
   * Derives the RabbitMQ Management API URL from an AMQP URL.
   * amqp://user:pass@host:5672/vhost -> http://host:15672
   */
  static deriveManagementUrl(amqpUrl: string): { url: string; auth: string; vhost: string; amqpUri: string } {
    const parsed = new URL(amqpUrl);
    const host = parsed.hostname;
    const managementPort = 15672;
    const protocol = 'http';
    const auth = Buffer.from(`${parsed.username}:${parsed.password}`).toString('base64');
    // vhost is the pathname without leading slash, default to '/'
    const vhost = parsed.pathname ? decodeURIComponent(parsed.pathname.slice(1)) || '/' : '/';
    // Build AMQP URI for shovel (without query string)
    const amqpUri = `amqp://${parsed.username}:${parsed.password}@${parsed.host}/${encodeURIComponent(vhost)}`;
    return {
      url: `${protocol}://${host}:${managementPort}`,
      auth,
      vhost,
      amqpUri,
    };
  }

  constructor(params: AMQPQueueConfig) {
    super();

    if (!(process.env.AMQP_URL || params.url)) {
      throw new Error('AMQP: url parameter required');
    }
    this.url = process.env.AMQP_URL || params.url as string;

    // Setup management API URL for shovel operations
    const derived = AmqpQueue.deriveManagementUrl(this.url);
    this.#managementUrl = derived.url;
    this.#managementAuth = derived.auth;
    this.#vhost = derived.vhost;
    this.#amqpUri = derived.amqpUri;

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
        promises.push(...bindingPromises);
      });
      return Promise.all(promises);
    };
    return createExchanges()
      .then(createQueues)
      .then(createBindings);
  }

  // Replies no retry can fix: wrong credentials or vhost, a topology
  // contradicting what the broker already holds, or a feature the broker
  // refuses (e.g. transient non-exclusive queues on RabbitMQ >= 4.3).
  static FATAL_REPLY_CODES = [403, 406, 530, 540, 541];
  static RETRY_DELAY_MS = 1000;
  static MAX_RETRY_DELAY_MS = 30000;

  /**
   * Whether `err` is worth retrying. A broker restarting answers with
   * refused connections, resets and, for a durable queue whose node is
   * down or still starting, 404 NOT_FOUND: all of these go away by
   * themselves. amqplib only sets `code` on errors raised once the
   * connection is open, hence the fallback on the handshake message.
   */
  static isRetryable(err: unknown): boolean {
    const { code, message } = (err || {}) as { code?: unknown, message?: string };
    const replyCode = typeof code === 'number'
      ? code
      : Number((/: (\d{3}) \(/.exec(message || '') || [])[1]);
    return !AmqpQueue.FATAL_REPLY_CODES.includes(replyCode);
  }

  async _setup() {
    const conn = await amqplib.connect(this.url);
    // Setup failures surface as rejected promises; this only keeps amqplib's
    // 'error' events from crashing the process meanwhile. When the broker
    // closes the whole connection, pending calls only reject with a generic
    // "Channel ended": keep the connection error, which carries the reply code.
    const ignore = () => undefined;
    let connError: Error | undefined;
    const keepConnError = (err: Error) => {
      connError = err;
    };
    conn.on('error', keepConnError);
    let channel: amqplib.ConfirmChannel;
    try {
      channel = await conn.createConfirmChannel();
      channel.on('error', ignore);
      await channel.prefetch(this.#prefetchCount);
      this.#channel = channel;
      await this._installTopology();
    } catch (err) {
      this.#channel = undefined;
      await conn.close().catch(ignore);
      throw connError || err;
    }
    this.#conn = conn;
    // Propagate errors
    conn.on('close', (err: Error) => {
      logger.error('Connection to queue closed', { err });
      this.emit('close', err);
    });
    conn.on('error', (err: Error) => {
      logger.error('Connection error', { err });
      this.emit('error', err);
    });
    channel.on('close', (err: Error) => {
      logger.error('Channel closed', err);
      this.emit('close', err);
    });
    channel.on('error', (err: Error) => {
      logger.error('Channel error', err);
      this.emit('error', err);
    });
    conn.off('error', keepConnError);
    channel.off('error', ignore);
  }

  async _connect() {
    let delay = AmqpQueue.RETRY_DELAY_MS;
    for (let attemptsLeft = this.#connectRetries; ; attemptsLeft--) {
      try {
        await this._setup();
        return this;
      } catch (err) {
        if (this.#disconnecting || attemptsLeft <= 0 || !AmqpQueue.isRetryable(err)) {
          logger.error(err, 'Unable to connect to rabbitmq... Giving up.');
          this.emit('error', err);
          return this;
        }
        const { message, code } = err as { message?: string, code?: unknown };
        logger.warn(`Unable to connect to rabbitmq (${message || code}). ${attemptsLeft} attempts left. Trying again in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, AmqpQueue.MAX_RETRY_DELAY_MS);
      }
    }
  }

  async _disconnect() {
    this.#disconnecting = true;
    if (this.#conn) {
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
      throw new Error('Cannot consume, no channel found');
    }
    const channel = this.#channel as ConfirmChannel;
    return channel.consume(queueName, (msg) => {
      // The broker cancelled the consumer (queue deleted, or its node went
      // down): nothing would ever be delivered again.
      if (msg === null) {
        if (!this.#disconnecting) {
          this.emit('error', new Error(`Consumer of queue ${queueName} cancelled by the broker`));
        }
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
      // Wrap in Promise.resolve to catch synchronous throws from processor
      Promise.resolve()
        .then(() => processor(payload, metadata as JobMeta))
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

  async _requeue(sourceQueue: string, options: RequeueOptions): Promise<RequeueResult> {
    const { count } = options;
    const vhostEncoded = encodeURIComponent(this.#vhost);
    const sourceQueueEncoded = encodeURIComponent(sourceQueue);
    // Use deterministic name so we can detect if a requeue is already in progress
    const shovelName = `arnavon-requeue-${sourceQueue}`;
    const shovelNameEncoded = encodeURIComponent(shovelName);

    logger.info(`${this.constructor.name}: Initiating requeue from ${sourceQueue} to exchange ${this.#exchange} via Shovel`);

    try {
      // Check if a shovel already exists for this source queue
      const statusUrl = `${this.#managementUrl}/api/shovels/${vhostEncoded}/${shovelNameEncoded}`;
      const existingResponse = await fetch(statusUrl, {
        headers: { 'Authorization': `Basic ${this.#managementAuth}` },
      });

      if (existingResponse.ok) {
        // Shovel already exists - a requeue is in progress
        throw new Error(
          `A requeue operation is already in progress for queue '${sourceQueue}'. ` +
          'Wait for it to complete before starting another.',
        );
      }

      // Get the message count from the source queue
      const queueInfoUrl = `${this.#managementUrl}/api/queues/${vhostEncoded}/${sourceQueueEncoded}`;
      const queueInfoResponse = await fetch(queueInfoUrl, {
        headers: { 'Authorization': `Basic ${this.#managementAuth}` },
      });

      let messageCount = 0;
      if (queueInfoResponse.ok) {
        const queueInfo = await queueInfoResponse.json() as { messages?: number };
        messageCount = queueInfo.messages ?? 0;
      }

      // Calculate estimated requeue count
      const estimatedCount = count !== undefined ? Math.min(count, messageCount) : messageCount;

      // Create shovel configuration - it will auto-delete after emptying the queue
      // Publish to the exchange without specifying a routing key - the shovel will
      // preserve the original routing key from each message
      const shovelConfig = {
        value: {
          'src-uri': this.#amqpUri,
          'src-queue': sourceQueue,
          'dest-uri': this.#amqpUri,
          'dest-exchange': this.#exchange,
          'src-delete-after': count ?? 'queue-length',
          'ack-mode': 'on-confirm',
          'add-forward-headers': true,
        },
      };

      // Create the shovel
      const createUrl = `${this.#managementUrl}/api/parameters/shovel/${vhostEncoded}/${shovelNameEncoded}`;
      const createResponse = await fetch(createUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.#managementAuth}`,
        },
        body: JSON.stringify(shovelConfig),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();

        if (createResponse.status === 404) {
          throw new Error(
            'RabbitMQ Shovel plugin not available. ' +
            'Ensure the rabbitmq_shovel and rabbitmq_shovel_management plugins are enabled.',
          );
        }
        if (createResponse.status === 401) {
          throw new Error('RabbitMQ Management API authentication failed.');
        }
        throw new Error(`Failed to create shovel (${createResponse.status}): ${errorText}`);
      }

      logger.info(`${this.constructor.name}: Shovel created, requeue initiated from ${sourceQueue} to exchange ${this.#exchange} (estimated: ${estimatedCount} messages)`);

      // Return immediately - shovel will auto-delete when done
      return {
        status: 'initiated',
        requeued: estimatedCount,
        failed: 0,
        errors: [],
      };
    } catch (err) {
      // Handle network errors
      if (err instanceof TypeError && (err as Error).message.includes('fetch')) {
        throw new Error(
          `Cannot connect to RabbitMQ Management API at ${this.#managementUrl}. ` +
          'Ensure RabbitMQ is running and the management plugin is enabled.',
        );
      }

      throw err;
    }
  }

  async _getQueuesInfo(queueNames: string[]): Promise<QueueInfo[]> {
    const vhostEncoded = encodeURIComponent(this.#vhost);

    const fetchQueueInfo = async (queueName: string): Promise<QueueInfo> => {
      const queueNameEncoded = encodeURIComponent(queueName);
      const queueInfoUrl = `${this.#managementUrl}/api/queues/${vhostEncoded}/${queueNameEncoded}`;

      try {
        const response = await fetch(queueInfoUrl, {
          headers: { 'Authorization': `Basic ${this.#managementAuth}` },
        });

        if (response.ok) {
          const info = await response.json() as {
            name: string;
            messages?: number;
            consumers?: number;
            state?: string;
          };

          return {
            name: info.name,
            messages: info.messages ?? 0,
            consumers: info.consumers ?? 0,
            state: info.state === 'running' ? 'running' : info.state === 'idle' ? 'idle' : 'unknown',
          };
        } else if (response.status === 404) {
          // Queue doesn't exist in RabbitMQ
          return { name: queueName, messages: 0, consumers: 0, state: 'unknown' };
        } else {
          logger.warn(`${this.constructor.name}: Failed to get info for queue ${queueName}: ${response.status}`);
          return { name: queueName, messages: 0, consumers: 0, state: 'unknown' };
        }
      } catch (err) {
        logger.error(err, `${this.constructor.name}: Error getting info for queue ${queueName}`);
        return { name: queueName, messages: 0, consumers: 0, state: 'unknown' };
      }
    };

    return Promise.all(queueNames.map(fetchQueueInfo));
  }

}

export default AmqpQueue;
