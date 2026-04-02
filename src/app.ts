import promClient from 'prom-client';
import Queue from './queue';
import { QueueConfig } from './queue';
import ArnavonConfig, {
  QueueDefinition,
  JobDefinition,
  ConsumerDefinition,
} from './config';
import { JobDispatcher } from './jobs';
import Consumer from './consumer';
import Server from './server';
import { ValidatorFn } from './jobs/validator';
import { HandlerFn } from './jobs/runners/function';

export interface JobOptions {
  validate?: ValidatorFn
  inputSchema?: string
  invalidJobExchange?: string
}

export interface ConsumerOptions {
  queue: string
  handler?: HandlerFn
  runner?: {
    type: string
    mode?: string
    config?: Record<string, unknown>
  }
}

/**
 * ArnavonApp - instance-based API for using Arnavon as a library.
 *
 * Usage:
 *   const app = new ArnavonApp({ queue: { driver: 'amqp', config: { ... } } })
 *   app.job('send-email', { validate: (d) => schema.parse(d) })
 *   app.consumer('mailer', { queue: 'emails', handler: async (job) => { ... } })
 *   await app.startApi({ port: 3000 })
 */
export default class ArnavonApp {

  #queueDefinition: QueueDefinition;
  #jobDefinitions: JobDefinition[] = [];
  #consumerDefinitions: ConsumerDefinition[] = [];
  #queue: Queue;
  #registry: promClient.Registry;
  #cwd: string;
  #server?: Server;
  #consumer?: Consumer;

  constructor(options: { queue: QueueDefinition, cwd?: string }) {
    this.#queueDefinition = options.queue;
    this.#cwd = options.cwd || process.cwd();
    this.#registry = new promClient.Registry();
    promClient.collectDefaultMetrics({ register: this.#registry });
    this.#queue = Queue.create(this.#queueDefinition as QueueConfig);
  }

  /**
   * Define a job type.
   */
  job(name: string, options: JobOptions = {}) {
    const inputSchema = options.validate || options.inputSchema || '.';
    this.#jobDefinitions.push({
      name,
      inputSchema,
      invalidJobExchange: options.invalidJobExchange,
    });
    return this;
  }

  /**
   * Define a consumer.
   */
  consumer(name: string, options: ConsumerOptions) {
    const def: ConsumerDefinition = {
      name,
      queue: options.queue,
    };
    if (options.handler) {
      def.handler = options.handler;
    } else if (options.runner) {
      def.runner = options.runner;
    }
    this.#consumerDefinitions.push(def);
    return this;
  }

  /**
   * Build the ArnavonConfig from accumulated definitions.
   */
  #buildConfig(): ArnavonConfig {
    return ArnavonConfig.from({
      queue: this.#queueDefinition,
      jobs: this.#jobDefinitions,
      consumers: this.#consumerDefinitions,
    }, this.#cwd);
  }

  /**
   * Start the REST API server for job submission.
   */
  async startApi({ port = 3000 } = {}) {
    const config = this.#buildConfig();
    this.#server = new Server(config, this.#registry, this.#queue);
    await this.#server.start(port);
    return this;
  }

  /**
   * Start a specific consumer by name.
   */
  async startConsumer(name: string, { port = 3000 } = {}) {
    const config = this.#buildConfig();
    const consumerConfig = config.consumers.find(c => c.name === name);
    if (!consumerConfig) {
      throw new Error(`No consumer with name '${name}' found`);
    }
    const dispatcher = new JobDispatcher(config, this.#registry, this.#queue);
    this.#consumer = new Consumer([consumerConfig], dispatcher, this.#registry, this.#queue, this.#cwd);
    await this.#consumer.start(port);
    return this;
  }

  /**
   * Start all consumers (or all except specified ones).
   */
  async startAllConsumers({ port = 3000, except = [] as string[] } = {}) {
    const config = this.#buildConfig();
    let configs = config.consumers;
    if (except.length > 0) {
      configs = configs.filter(c => !except.includes(c.name));
    }
    if (configs.length === 0) {
      throw new Error('No consumers to start');
    }
    const dispatcher = new JobDispatcher(config, this.#registry, this.#queue);
    this.#consumer = new Consumer(configs, dispatcher, this.#registry, this.#queue, this.#cwd);
    await this.#consumer.start(port);
    return this;
  }

  /**
   * Stop the running server or consumer.
   */
  async stop() {
    if (this.#server) {
      await this.#server.stop();
    }
    if (this.#consumer) {
      await this.#consumer.stop();
    }
  }

  /**
   * Access the prometheus registry (for custom metrics or embedding).
   */
  get registry() {
    return this.#registry;
  }

  /**
   * Access the queue instance.
   */
  get queue() {
    return this.#queue;
  }

  /**
   * Access the queue definition (driver + config).
   */
  get queueDefinition() {
    return this.#queueDefinition;
  }

  /**
   * Create an ArnavonApp from a YAML config file.
   * Convenience for migrating from CLI to library usage.
   */
  static fromYaml(fname = 'config.yaml'): ArnavonApp {
    const config = ArnavonConfig.fromFile(fname);
    const app = new ArnavonApp({
      queue: config.queue as unknown as QueueDefinition,
      cwd: config.cwd,
    });

    // Register all jobs from config
    for (const job of config.jobs) {
      app.#jobDefinitions.push({
        name: job.name,
        inputSchema: job.inputSchema as string | ValidatorFn,
        invalidJobExchange: job.invalidJobExchange,
      });
    }

    // Register all consumers from config
    for (const consumer of config.consumers) {
      app.#consumerDefinitions.push({
        name: consumer.name,
        queue: consumer.queue,
        runner: consumer.runner as ConsumerDefinition['runner'],
      });
    }

    return app;
  }
}
