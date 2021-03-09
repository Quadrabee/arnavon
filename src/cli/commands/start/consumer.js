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

    let configs = [];
    if (flags.all) {
      configs = Arnavon.config.consumers;
    } else {
      if (!args.consumerName) {
        throw new Error('The name of a consumer must be provided');
      }
      const consumerConfig = Arnavon.config.consumers.find(c => c.name === args.consumerName);
      if (!consumerConfig) {
        throw new Error(`No consumer with name '${args.consumerName} found`);
      }
      configs.push(consumerConfig);
    }
    const consumer = new Consumer(configs, dispatcher);
    consumer.start(port);
  }
}

StartConsumerCommand.description = `Starts an Arnavon consumer
...
This command can be used to start one of the consumer defined in your config file.

Please note that the --all flag can be used to start all consumers at once, but this is not recommended in production.
`;

StartConsumerCommand.flags = {
  ...Command.flags,
  all: flags.boolean({ char: 'a', description: 'Start all consumers instead of just one (not recommended, but can be useful in dev)' }),
  port: flags.integer({ char: 'p', description: 'Port to use for API (default 3000)' })
};

export default StartConsumerCommand;
