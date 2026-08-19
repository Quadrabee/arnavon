import NodeJSRunner from './nodejs';
import BinaryRunner from './binary';
import FunctionRunner from './function';
import JobRunner, { JobRunnerConfig } from '../runner';

export type RunnerRegistry = {[key: string]: typeof JobRunner};

class RunnersFactory {
  private runners: RunnerRegistry;
  constructor() {
    this.runners = {};
  }

  register(type: string, clazz: typeof JobRunner) {
    this.runners[type] = clazz;
  }

  get(type: string): typeof JobRunner {
    if (!this.runners[type]) {
      throw new Error(`Unknown runner type: ${type}`);
    }
    return this.runners[type];
  }

  factor(type: string, config: JobRunnerConfig, registry?: import('prom-client').Registry) {
    const clazz = this.get(type);
    return new clazz(config, registry);
  }
}

const factory = new RunnersFactory();
factory.register('nodejs', NodeJSRunner);
factory.register('binary', BinaryRunner);
factory.register('function', FunctionRunner);

export default factory;
