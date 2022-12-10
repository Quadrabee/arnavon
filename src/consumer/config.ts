import { JobRunnerConfig } from '../jobs/runner';
import { inspect } from '../robust';

export default class ConsumerConfig {

  public readonly name: string;
  public readonly queue: string;
  public readonly runner: JobRunnerConfig
  /**
   * Constructs a new ConsumerConfig object
   */
  constructor(cfg: ConsumerConfig) {
    if (!cfg) {
      throw new Error(`Config object expected, got ${inspect(cfg)}`);
    }

    if (!cfg.name || typeof cfg.name !== 'string') {
      throw new Error(`Valid job name expected, got ${cfg.name}`);
    }

    this.name = cfg.name;
    this.runner = cfg.runner;
    this.queue = cfg.queue;
  }

  /**
   * Used by finitio to dress
   */
  static json(data: ConsumerConfig) {
    return new ConsumerConfig(data);
  }
}
