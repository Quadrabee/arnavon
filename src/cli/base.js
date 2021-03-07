import { Command, flags } from '@oclif/command';

class BaseCommand extends Command {
  log(msg, level) {
    switch (this.flags.loglevel) {
    case 'error':
      if (level === 'error') console.error(msg);
      break;
    // a complete example would need to have all the levels
    }
  }

  async init() {
    // do some initialization
    const { flags } = this.parse(this.constructor);
    this.flags = flags;
  }
  async catch(err) {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err);
  }
  async finally(err) {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(err);
  }
}

BaseCommand.flags = {
  config: flags.string({ char: 'c', description: 'location of config file (default "config.yaml")' })
};

export default BaseCommand;
