import Config from '../config';
import Queue from '../queue';
import createApi from './rest';
import logger from '../logger';
import { JobProcessor } from '../jobs';

export default class Server {

  #config;
  #queue;
  #api;
  #processor;
  constructor(config, queue) {
    this.#config = config;
    this.#queue = queue;
    this.#processor = new JobProcessor(config, queue);
    this.#api = createApi({ config, processor: this.#processor });
  }

  _startApi() {
    return new Promise((resolve, reject) => {
      this.#api.listen(3000, (err) => {
        if (err) {
          return reject(err);
        }
        logger.info('REST API listening at http://localhost:3000');
        return resolve();
      });
    });
  }

  _connectQueue() {
    return this.#queue.connect();
  }

  startServer() {
    this._connectQueue()
      .then(() => this._startApi());
  }

  static create() {
    const config = Config.load();
    const queue = Queue.create(config.queue);
    return new Server(config, queue);
  }
}
