import createApi from '../api';
import logger from '../logger';
import Arnavon from '..';

export default class Consumer {

  #api;
  constructor(config) {
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
    return Arnavon.queue.connect();
  }

  _startConsuming() {
    logger.info('Consumer starting consumption');
    Arnavon.queue.consume((job) => {
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
