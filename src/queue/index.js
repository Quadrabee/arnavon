import EventEmitter from 'events';
import logger from '../logger';

/**
 * Queue subclasses are supposed to properly emit the following events:
 *   - close (when the connection is closed)
 *   - error (if the connection closes)
 */
class Queue extends EventEmitter {

  #config;
  constructor(config) {
    super();
    this.#config = config;
  }

  static create(config, selector) {
    const drivers = require('./drivers').default;
    const { driver } = config;
    if (!drivers[driver]) {
      throw new Error(`Unknown queue driver: ${driver}`);
    }
    // Merge selector into driver params (in case the driver supports it)
    const params = Object.assign({}, config[driver], { selector });
    return new drivers[driver](params);
  }

  // get selector
  get selector() {
    return (this.#config && this.#config.selector) ? this.#config.selector : '*';
  }

  // subclasses should implement _connect()
  connect() {
    logger.info(`${this.constructor.name} - Connecting to queue`);
    return this._connect().then((res) => {
      logger.info(`${this.constructor.name} - Connected`);
      return res;
    });
  }

  // subclasses should implement _push(key, data)
  push(key, data) {
    logger.info(`${this.constructor.name} - Pushing to queue`, key, data);
    return this._push(key, data).then((res) => {
      logger.info(`${this.constructor.name} - Pushed`);
      return res;
    });
  }

  // subclasses should implement _consumer(processor)
  consume(processor) {
    logger.info(`${this.constructor.name} - Starting consumption of queue with selector ${this.selector}`);
    return this._consume((item) => {
      logger.info(`${this.constructor.name} - Consuming queue item`, item);
      return processor(item);
    });
  }

}

export default Queue;
