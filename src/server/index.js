import createApi from './rest';
import logger from '../logger';
import { JobDispatcher } from '../jobs';
import { inspect } from '../robust';
import ArnavonConfig from '../config';
import Arnavon from '../';

export default class Server {

  #api;
  #dispatcher;
  constructor(config) {
    if (!(config instanceof ArnavonConfig)) {
      throw new Error(`ArnavonConfig expected, got ${inspect(config)}`);
    }
    this.#dispatcher = new JobDispatcher(config);
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
    return Arnavon.queue.connect();
  }

  start(port = 3000) {
    return this._connectQueue()
      .then(() => {
        this._startApi(port);
      })
      .catch((err) => {
        console.error(err);
        process.exit(10);
      });
  }
}
