import createApi from './rest';
import logger from '../logger';
import { JobDispatcher } from '../jobs';
import { inspect } from '../robust';
import ArnavonConfig from '../config';
import Arnavon from '../';

export default class Server {

  #api;
  #server;
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
      this.#server = this.#api.listen(port, (err) => {
        if (err) {
          return reject(err);
        }
        logger.info(`REST API listening at http://0.0.0.0:${port}`);
        return resolve();
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

  stop() {
    logger.error('Server stopping...');
    this._stopApi();
    this._disconnectQueue();
  }
}
