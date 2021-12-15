import { Command, flags } from '@oclif/command';
import { Config, default as Arnavon } from '../';

class BaseCommand extends Command {
  async init() {
    const { flags } = this.parse(this.constructor);
    this.flags = flags;
    const configPath = flags.config || 'config.yaml';

    const config = Config.fromFile(configPath);
    Arnavon.init(config);
  }
  async catch(err) {
    return super.catch(err);
  }
  async finally(err) {
    return super.finally(err);
  }
}

BaseCommand.flags = {
  config: flags.string({ char: 'c', description: 'location of config file (default "config.yaml")' }),
};

export default BaseCommand;
