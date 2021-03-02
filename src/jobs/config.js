import Finitio from 'finitio';
import { inspect } from '../robust';

export default class JobConfig {

  #system;

  /**
   * Constructs a new JobConfig object
   * @param {Object} cfg: a configuration object with valid `id` and `schema`
   * @param {Finitio.System} system: an existing finitio system the inputSchema should inherit from
   */
  constructor(cfg, system) {
    if (!cfg) {
      throw new Error(`Config object expected, got ${inspect(cfg)}`);
    }

    if (!cfg.name || typeof cfg.name !== 'string') {
      throw new Error(`Valid job name expected, got ${cfg.name}`);
    }

    if (!cfg.inputSchema) {
      throw new Error(`Finitio inputSchema expected, got ${inspect(cfg.inputSchema)}`);
    }

    Object.assign(this, cfg, {
      inputSchema: ensureSchema(cfg.inputSchema, system)
    });
  }

  /**
   * Used by finitio to dress
   */
  static json(data, baseSystem) {
    return new JobConfig(data, baseSystem);
  }
}

// Private utils
function ensureSchema(schema, parentSystem) {
  if (!parentSystem) {
    parentSystem = Finitio.system('@import finitio/data');
  }
  let system;
  if (typeof schema === 'string') {
    try {
      system = parentSystem.subsystem(schema);
    } catch (err) {
      throw new Error(`Invalid finitio system: ${err.message}`);
    }
  } else {
    system = schema;
  }

  if (!(system instanceof Finitio.System)) {
    throw new Error(`Finitio inputSchema expected, got ${inspect(schema)}`);
  }

  return system;
}

