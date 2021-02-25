import Config from '../config';
import Queue from '../queue';
import createApi from './rest';
import logger from '../logger';
import { JobDispatcher } from '../jobs';

export default class Server {

  #config;
  #queue;
  #api;
  #dispatcher;
  constructor(config) {
    this.#config = config;
    this.#queue = Queue.create(config.queue);
    this.#dispatcher = new JobDispatcher(config, this.#queue);
    this.#api = createApi({ config, dispatcher: this.#dispatcher });
  }

  _startApi(port) {
    return new Promise((resolve, reject) => {
      this.#api.listen(port, (err) => {
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

  startServer(port = 3000) {
    this._connectQueue()
      .then(() => this._startApi(port));
  }

  static create() {
    const config = Config.load();
    const queue = Queue.create(config.queue);
    return new Server(config, queue);
  }
}
