import path from 'path';
import Config from './config';
import Consumer from './consumer';
import Server from './server';
import Queue from './queue';
import promClient from 'prom-client';

import { inspect } from './robust';
import ArnavonConfig from './config';

/**
 * Arnavon uses a singleton pattern for the main "module"
 * exposing the prometheus instance, the queue, the config etc
 */
class Arnavon {
  static registry: promClient.Registry;
  static queue: Queue;
  static config: ArnavonConfig;

  static init(config: ArnavonConfig) {
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

  static require(fname: string) {
    return require(path.join(Arnavon.cwd(), fname));
  }

  // for test purposes, shouldn't really be used
  static reset() {
    Arnavon.registry = new promClient.Registry();
    promClient.collectDefaultMetrics({ register: Arnavon.registry });
  }
}

export default Arnavon;

export {
  Config,
  Queue,
  Server,
  Consumer,
};

export * from './consumer';
export * from './server';
export * from './queue';
export * from './jobs';
export * from './config';
