import Finitio from 'finitio';
import { inspect } from '../robust';

export default class JobConfig {

  #schema;

  /**
   * Constructs a new JobConfig object
   * @param {Object} cfg: a configuration object with valid `id` and `schema`
   */
  constructor(cfg) {
    if (!cfg) {
      throw new Error(`Config object expected, got ${inspect(cfg)}`);
    }

    if (!cfg.id || typeof cfg.id !== 'string') {
      throw new Error(`Valid job id expected, got ${cfg.id}`);
    }

    if (!cfg.schema) {
      throw new Error(`Finitio schema expected, got ${inspect(cfg.schema)}`);
    }
    this.#schema = ensureSchema(cfg.schema);
  }
}

// Private utils
function ensureSchema(schema) {
  let system;
  if (typeof schema === 'string') {
    try {
      system = Finitio.system(schema);
    } catch (err) {
      throw new Error(`Invalid finitio system: ${err.message}`);
    }
  } else {
    system = schema;
  }

  if (!(system instanceof Finitio.System)) {
    throw new Error(`Finitio schema expected, got ${inspect(schema)}`);
  }

  return system;
}

