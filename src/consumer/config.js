import { inspect } from '../robust';

export default class ConsumerConfig {

  /**
   * Constructs a new ConsumerConfig object
   */
  constructor(cfg) {
    if (!cfg) {
      throw new Error(`Config object expected, got ${inspect(cfg)}`);
    }

    if (!cfg.id || typeof cfg.id !== 'string') {
      throw new Error(`Valid job id expected, got ${cfg.id}`);
    }

    Object.assign(this, cfg);
  }

  /**
   * Used by finitio to dress
   */
  static json(data) {
    return new ConsumerConfig(data);
  }
}
