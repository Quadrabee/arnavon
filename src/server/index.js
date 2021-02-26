import Config from '../config';
import Queue from '../queue';
import createApi from './rest';
import logger from '../logger';
import { JobDispatcher } from '../jobs';
import { inspect } from '../robust';
import ArnavonConfig from '../config';

export default class Server {

  #config;
  #queue;
  #api;
  #dispatcher;
  constructor(config) {
    if (!(config instanceof ArnavonConfig)) {
      throw new Error(`ArnavonConfig expected, got ${inspect(config)}`);
    }
    this.#config = config;
    this.#queue = Queue.create(config.queue);
    this.#dispatcher = new JobDispatcher(config, this.#queue);
    this.#api = createApi(this.#dispatcher);
  }

  _startApi(port) {
    return new Promise((resolve, reject) => {
      this.#api.listen(port, (err) => {
        if (err) {
          return reject(err);
        }
        logger.info(`REST API listening at http://0.0.0.0:${port}`);
        return resolve();
      });
    });
  }

  _connectQueue() {
    return this.#queue.connect();
  }

  start(port = 3000) {
    this._connectQueue()
      .then(() => this._startApi(port))
      .catch((err) => {
        console.error(err);
        process.exit(10);
      });
  }
}
