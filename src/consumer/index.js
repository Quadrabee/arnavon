import createApi from '../api';
import logger from '../logger';
import ConsumerConfig from './config';
import { inspect } from '../robust';
import Arnavon from '..';
import { Job, JobRunner, JobDispatcher } from '../jobs';

export default class Consumer {

  #api;
  #config;
  #runner;
  #dispatcher;

  constructor(config, dispatcher) {
    if (!(config instanceof ConsumerConfig)) {
      throw new Error(`ConsumerConfig expected, got ${inspect(config)}`);
    }
    if (!(dispatcher instanceof JobDispatcher)) {
      throw new Error(`JobDispatcher expected, got ${inspect(dispatcher)}`);
    }
    this.#api = createApi();
    this.#config = config;
    this.#runner = JobRunner.factor(config.runner.type, config.runner.config);
    this.#dispatcher = dispatcher;
  }

  _startApi(port) {
    return new Promise((resolve, reject) => {
      this.#api.listen(port, (err) => {
        if (err) {
          return reject(err);
        }
        logger.info(`Consumer API listening at http://0.0.0.0:${port}`);
        return resolve();
      });
    });
  }

  _connectQueue() {
    return Arnavon.queue.connect();
  }

  _startConsuming() {
    logger.info('Consumer starting consumption');
    return Arnavon.queue.consume(this.#config.queue, (_job, context) => {
      // Convert it back to a job instance
      const job = Job.fromJSON(_job);
      // Extend context to include dispatcher
      const extendedContext = Object.assign({}, context, { dispatcher: this.#dispatcher });
      return this.#runner.run(job, extendedContext);
    });
  }

  start(port = 3000) {
    return this._connectQueue()
      .then(() => this._startApi(port))
      .then(() => this._startConsuming())
      .catch((err) => {
        console.error(err);
        process.exit(10);
      });
  }
}
