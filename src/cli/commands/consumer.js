import Command from '../base';
import { flags } from '@oclif/command';
import { Config, Consumer, default as Arnavon } from '../../';
import { JobDispatcher } from '../../jobs';

class ConsumerCommand extends Command {

  static args = [{
    name: 'consumerName',
    required: true,
    description: 'The name of the consumer to start'
  }]

  async run() {
    const { args, flags } = this.parse(ConsumerCommand);
    const port = flags.port || 3000;
    const configPath = flags.config || 'config.yaml';

    const config = Config.fromFile(configPath);
    Arnavon.init(config);

    const dispatcher = new JobDispatcher(config);

    const consumerConfig = config.consumers.find(c => c.name === args.consumerName);
    if (!consumerConfig) {
      throw new Error(`No consumer with name '${args.consumerName} found`);
    }
    const consumer = new Consumer(consumerConfig, dispatcher);
    consumer.start(port);
  }
}

ConsumerCommand.description = `Starts an Arnavon consumer
...
TO BE DOCUMENTED
`;

ConsumerCommand.flags = {
  ...Command.flags,
  port: flags.integer({ char: 'p', description: 'Port to use for the API exposing prometheus metrics (default 3000)' })
};

export default ConsumerCommand;
