import path from 'path';
import Config from './config';
import Consumer from './consumer';
import Server from './server';
import Queue from './queue';
import promClient from 'prom-client';

import { inspect } from './robust';
import ArnavonConfig from './config';

/**
 * Arnavon singleton - convenience facade for CLI usage.
 *
 * Internal components (Server, Consumer, JobDispatcher, JobRunner, createApi)
 * no longer depend on this singleton. They accept registry, queue, and cwd
 * as explicit parameters, falling back to Arnavon.* only when not provided.
 *
 * For library usage, pass dependencies explicitly instead of relying on
 * Arnavon.init().
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

  /** @deprecated Use config.cwd directly or pass cwd to components */
  static cwd() {
    return Arnavon.config.cwd;
  }

  /** @deprecated Pass module functions directly or use cwd config option */
  static require(fname: string) {
    return require(path.join(Arnavon.cwd(), fname));
  }

  static reset() {
    // Disconnect old queue to prevent memory leaks
    if (Arnavon.queue) {
      Arnavon.queue.disconnect().catch(() => {
        // Ignore disconnect errors during reset
      });
    }
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
