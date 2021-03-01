import createApi from '../api';
import logger from '../logger';
import ConsumerConfig from './config';
import { inspect } from '../robust';
import Arnavon from '..';

export default class Consumer {

  #api;
  #config;
  constructor(config) {
    if (!(config instanceof ConsumerConfig)) {
      throw new Error(`ConsumerConfig expected, got ${inspect(config)}`);
    }
    this.#api = createApi();
    this.#config = config;
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
    return Arnavon.queue.consume(this.#config.jobSelector, (job) => {
      console.log('job job job', job);
      return Promise.resolve();
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
