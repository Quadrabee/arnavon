import Queue from '../queue';
import createApi from '../api';
import logger from '../logger';
import { inspect } from '../robust';
import ArnavonConfig from '../config';

export default class Consumer {

  #queue;
  #config;
  #api;
  constructor(config) {
    if (!(config instanceof ArnavonConfig)) {
      throw new Error(`ArnavonConfig expected, got ${inspect(config)}`);
    }
    this.#config = config;
    this.#queue = Queue.create(config.queue);
    this.#api = createApi();
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
    return this.#queue.connect();
  }

  _startConsuming() {
    logger.info('Consumer starting consumption');
    this.#queue.consume((job) => {
      console.log('job job job', job);
      return Promise.resolve();
    });
  }

  start(port) {
    this._startApi(port)
      .then(() => this._connectQueue())
      .then(() => this._startConsuming())
      .catch((err) => {
        console.error(err);
        process.exit(10);
      });
  }
}
