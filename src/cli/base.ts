import { Command, Flags, Interfaces } from '@oclif/core';
import { Config, default as Arnavon } from '../';

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<typeof BaseCommand['globalFlags'] & T['flags']>

export abstract class BaseCommand<T extends typeof Command> extends Command {

  protected flags!: Flags<T>

  static globalFlags = {
    config: Flags.string({
      summary: 'location of config file (defaults to \'config.yaml\').',
      char: 'c',
    }),
  }

  async init() {
    const { flags } = await this.parse(this.constructor as Interfaces.Command.Class);
    this.flags = flags;
    const configPath = flags.config || 'config.yaml';

    const config = Config.fromFile(configPath);
    Arnavon.init(config);
  }
  async catch(err: Error) {
    return super.catch(err);
  }
  async finally(err: Error) {
    return super.finally(err);
  }
}

export default BaseCommand;
