import Command from '../../base';
import { flags } from '@oclif/command';
import { Consumer, default as Arnavon } from '../../../';
import { JobDispatcher } from '../../../jobs';

class StartConsumerCommand extends Command {

  static args = [{
    name: 'name',
    required: false,
    description: 'The name of the consumer to start'
  }]

  async run() {
    const { args, flags } = this.parse(StartConsumerCommand);
    const port = flags.port || 3000;
    const dispatcher = new JobDispatcher(Arnavon.config);

    const ensureConsumerExists = (name) => {
      const consumerConfig = Arnavon.config.consumers.find(c => c.name === name);
      if (!consumerConfig) {
        throw new Error(`No consumer with name '${name}' found`);
      }
      return consumerConfig;
    };

    // Ensure -x/--except lists existing consumers
    if (flags.except) {
      flags.except.forEach((name) => {
        ensureConsumerExists(name);
      });
    }

    let configs = [];
    if (flags.all) {
      configs = [...Arnavon.config.consumers];
      if (flags.except) {
        configs = configs.filter((c) => flags.except.indexOf(c.name) < 0);
      }
    } else {
      if (!args.name) {
        throw new Error('The name of a consumer must be provided');
      }
      const consumerConfig = ensureConsumerExists(args.name);
      configs.push(consumerConfig);
    }

    if (!configs.length) {
      throw new Error('Empty list of consumers');
    }

    console.log('Starting consumers:', configs.map(c => c.name));
    const consumer = new Consumer(configs, dispatcher);
    consumer.start(port);

    // Quit properly on SIGINT (typically ctrl-c)
    process.on('SIGINT', function() {
      consumer.stop();
    });
    // Quit properly on SIGTERM (typically kubernetes termination)
    process.on('SIGTERM', function() {
      consumer.stop();
    });

  }
}

StartConsumerCommand.description = `Starts an Arnavon consumer
...
This command can be used to start one of the consumer defined in your config file.

Please note that the --all flag can be used to start all consumers at once, but this is not recommended in production.
`;

StartConsumerCommand.flags = {
  ...Command.flags,
  all: flags.boolean({
    char: 'a',
    description: 'Start all consumers instead of just one (not recommended, but can be useful in dev)'
  }),
  except: flags.string({
    char: 'x',
    description: 'Specify a consumer that should not be started. (Requires -a/--all. Can be used multiple times)',
    multiple: true,
    dependsOn: ['all']
  }),
  port: flags.integer({
    char: 'p',
    description: 'Port to use for API (default 3000)'
  })
};

export default StartConsumerCommand;
