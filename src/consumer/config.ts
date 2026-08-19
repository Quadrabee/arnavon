import { JobRunnerConfig } from '../jobs/runner';
import { HandlerFn } from '../jobs/runners/function';
import { inspect } from '../robust';

export default class ConsumerConfig {

  public readonly name: string;
  public readonly queue: string;
  public readonly runner: JobRunnerConfig;

  /**
   * Constructs a new ConsumerConfig object.
   *
   * Accepts either a runner config ({ type, config }) or a handler function.
   * When a handler function is provided, it is wrapped in a FunctionRunner config.
   */
  constructor(cfg: ConsumerConfig | { name: string, queue: string, handler: HandlerFn }) {
    if (!cfg) {
      throw new Error(`Config object expected, got ${inspect(cfg)}`);
    }

    if (!cfg.name || typeof cfg.name !== 'string') {
      throw new Error(`Valid job name expected, got ${cfg.name}`);
    }

    this.name = cfg.name;
    this.queue = cfg.queue;

    if ('handler' in cfg && typeof cfg.handler === 'function') {
      // v2 style: wrap handler function as a FunctionRunner config
      this.runner = {
        type: 'function',
        config: { handler: cfg.handler },
      } as JobRunnerConfig;
    } else if ('runner' in cfg) {
      this.runner = (cfg as ConsumerConfig).runner;
    } else {
      throw new Error(`Either runner or handler expected in consumer config '${cfg.name}'`);
    }
  }

  /**
   * Used by finitio to dress
   */
  static json(data: ConsumerConfig) {
    return new ConsumerConfig(data);
  }
}
