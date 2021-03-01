import path from 'path';
import Config from './config';
import Consumer from './consumer';
import Server from './server';
import Queue from './queue';
import promClient from 'prom-client';
import { inspect } from './robust';

/**
 * Arnavon uses a singleton pattern for the main "module"
 * exposing the prometheus instance, the queue, the config etc
 */
class Arnavon {
  static registry;
  static queue;
  static config;

  static init(config) {
    if (!(config instanceof Config)) {
      throw new Error(`ArnavonConfig expected, got ${inspect(config)}`);
    }
    Arnavon.reset();
    Arnavon.queue = Queue.create(config.queue);
    Arnavon.config = config;
  }

  static cwd() {
    return Arnavon.config.cwd;
  }

  static require(fname) {
    return require(path.join(Arnavon.cwd(), fname));
  }

  // for test purposes, shouldn't really be used
  static reset() {
    Arnavon.registry = new promClient.Registry();
  }
}

export default Arnavon;

export {
  Config,
  Queue,
  Server,
  Consumer
};
