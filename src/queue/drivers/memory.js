import Queue from '../index';

class MemoryQueue extends Queue {

  #queue;
  constructor(params) {
    super(params);
    this.#queue = [];
  }

  _connect() {
    return Promise.resolve(this);
  }

  _push(key, data) {
    this.#queue.push({ key, data });
    return Promise.resolve();
  }

  _consume(processor) {
    while (this.#queue.length) {
      const { key, data } = this.#queue.shift();
      processor(key, data);
    }
  }

}

export default MemoryQueue;
