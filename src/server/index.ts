import createApi from './rest';
import logger from '../logger';
import { JobDispatcher } from '../jobs';
import { inspect } from '../robust';
import ArnavonConfig from '../config';
import Arnavon from '../';
import { Server as HttpServer } from 'http';
import promClient from 'prom-client';
import Queue from '../queue';

export default class Server {

  #api;
  #server?: HttpServer;
  #dispatcher;
  #queue: Queue;

  constructor(config: ArnavonConfig, registry?: promClient.Registry, queue?: Queue) {
    if (!(config instanceof ArnavonConfig)) {
      throw new Error(`ArnavonConfig expected, got ${inspect(config)}`);
    }
    const reg = registry || Arnavon.registry;
    this.#queue = queue || Arnavon.queue;
    this.#dispatcher = new JobDispatcher(config, reg, this.#queue);
    this.#api = createApi(this.#dispatcher, { registry: reg, queue: this.#queue, config });
  }

  _startApi(port: number) {
    return new Promise((resolve) => {
      this.#server = this.#api.listen(port, () => {
        logger.info(`REST API listening at http://0.0.0.0:${port}`);
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
    this.#queue.on('error', () => {
      logger.error('Queue errored, quitting');
      process.exit(10);
    });
    this.#queue.on('close', () => {
      logger.error('Queue disconnected, quitting');
      process.exit(10);
    });
    return this.#queue.connect();
  }

  _disconnectQueue() {
    return this.#queue.disconnect();
  }

  start(port = 3000) {
    return this._connectQueue()
      .then(() => {
        return this._startApi(port);
      })
      .catch((err) => {
        logger.error(err, 'Server failed to start');
        process.exit(10);
      });
  }

  async stop() {
    logger.info('Server stopping...');
    this._stopApi();
    await this._disconnectQueue();
  }
}
