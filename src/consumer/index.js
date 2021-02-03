import Config from '../config';
import Queue from '../queue';
import createApi from '../api';
import logger from '../logger';
import { AWFMError } from '../robust';

export default class Consumer {

  #queue;
  #config;
  #api;
  constructor(config, queue) {
    this.#queue = queue;
    this.#config = config;

    this.#api = createApi();
  }

  _startApi() {
    return new Promise((resolve, reject) => {
      this.#api.listen(3000, (err) => {
        if (err) {
          return reject(err);
        }
        logger.info('Consumer API listening at http://localhost:3000');
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

  startConsumer() {
    this._startApi()
      .then(() => this._connectQueue())
      .then(() => this._startConsuming());
  }

  static create(jobId) {
    const config = Config.load();
    const jobDef = config.jobs.find(j => j.id === jobId);
    if (!jobDef) {
      throw new AWFMError(`Unknown job: ${jobId}`);
    }
    const queue = Queue.create(config.queue, jobId);
    return new Consumer(jobDef, queue);
  }
}

// // Create the queue client and expose on requests
// const queue = Queue.create();

// queue.connect().then((queue) => {

//   // if the connection is severed => quit
//   queue.on('error', (err) => {
//     console.error(err);
//     process.exit(-1);
//   });

//   queue.consume((msg) => {
//     console.log('Processor\'s logic', msg);
//     return Promise.resolve();
//   });

// });

// process.on('unhandledRejection', error => {
//   console.log('unhandledRejection', error);
//   process.exit(-1);
// });
