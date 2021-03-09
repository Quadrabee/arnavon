import Command from '../base';
import { flags } from '@oclif/command';
import { Config, Consumer, default as Arnavon } from '../../';
import { JobDispatcher } from '../../jobs';

class ConsumerCommand extends Command {

  static args = [{
    name: 'consumerName',
    required: false,
    description: 'The name of the consumer to start'
  }]

  async run() {
    const { args, flags } = this.parse(ConsumerCommand);
    const port = flags.port || 3000;
    const configPath = flags.config || 'config.yaml';

    const config = Config.fromFile(configPath);
    Arnavon.init(config);

    const dispatcher = new JobDispatcher(config);

    let configs = [];
    if (flags.all) {
      configs = config.consumers;
    } else {
      if (!args.consumerName) {
        throw new Error('The name of a consumer must be provided');
      }
      const consumerConfig = config.consumers.find(c => c.name === args.consumerName);
      if (!consumerConfig) {
        throw new Error(`No consumer with name '${args.consumerName} found`);
      }
      configs.push(consumerConfig);
    }
    const consumer = new Consumer(configs, dispatcher);
    consumer.start(port);
  }
}

ConsumerCommand.description = `Starts an Arnavon consumer
...
TO BE DOCUMENTED
`;

ConsumerCommand.flags = {
  ...Command.flags,
  port: flags.integer({ char: 'p', description: 'Port to use for the API exposing prometheus metrics (default 3000)' }),
  all: flags.boolean({ char: 'a', description: 'Start all consumers instead of just one (not recommended, but can be useful in dev)' })
};

export default ConsumerCommand;
