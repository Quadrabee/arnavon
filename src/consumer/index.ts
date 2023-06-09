import createApi from '../api';
import logger from '../logger';
import ConsumerConfig from './config';
import { inspect } from '../robust';
import Arnavon from '..';
import { Server } from 'http';
import { JobRunner, JobDispatcher } from '../jobs';

export default class Consumer {

  #api;
  #server?: Server;
  #configs;
  #dispatcher;
  #processes;

  constructor(configs: Array<ConsumerConfig>, dispatcher: JobDispatcher) {
    configs = ([] as Array<ConsumerConfig>).concat(configs).flat();
    configs.forEach((cfg) => {
      if (!(cfg instanceof ConsumerConfig)) {
        throw new Error(`ConsumerConfig expected, got ${inspect(cfg)}`);
      }
    });
    if (!(dispatcher instanceof JobDispatcher)) {
      throw new Error(`JobDispatcher expected, got ${inspect(dispatcher)}`);
    }
    this.#api = createApi();
    this.#dispatcher = dispatcher;
    this.#configs = configs;
  }

  _startApi(port: number) {
    return new Promise((resolve) => {
      this.#server = this.#api.listen(port, () => {
        logger.info(`Consumer API listening at http://0.0.0.0:${port}`);
        return resolve(this);
      });
    });
  }

  _stopApi() {
    if (this.#server) {
      this.#server.close();
    }
  }

  _connectQueue() {
    Arnavon.queue.on('error', () => {
      logger.error('Queue errored, quitting');
      process.exit(10);
    });
    Arnavon.queue.on('close', () => {
      logger.error('Queue disconnected, quitting');
      process.exit(10);
    });
    return Arnavon.queue.connect();
  }

  _disconnectQueue() {
    return Arnavon.queue.disconnect();
  }

  _startConsuming() {
    logger.info('Consumer starting consumption');
    this.#processes = this.#configs.map((config: ConsumerConfig) => {
      const runner = JobRunner.factor(config.runner.type, {
        mode: config.runner.mode,
        ...config.runner.config,
      });
      return Arnavon.queue.consume(config.queue, (_job, context) => {
        // Dress the payload
        const validator = this.#dispatcher.getValidator(_job.meta);
        _job.payload = validator.validate(_job.payload);
        // Extend context to include dispatcher and prometheus registry
        const extendedContext = Object.assign({}, context, {
          dispatcher: this.#dispatcher,
          prometheusRegistry: Arnavon.registry,
        });
        return runner.run(_job, extendedContext);
      });
    });
    return Promise.all(this.#processes);
  }

  start(port = 3000) {
    return this._connectQueue()
      .then(() => this._startApi(port))
      .then(() => this._startConsuming())
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(10);
      });
  }

  stop() {
    logger.error('Server stopping...');
    this._stopApi();
    this._disconnectQueue();
  }
}
