import { Command, Flags } from '@oclif/core';
import ArnavonApp from '../../../app';

export default class StartConsumerCommand extends Command {

  static summary = `Starts an Arnavon consumer
...
This command can be used to start one of the consumer defined in your config file.

Please note that the --all flag can be used to start all consumers at once, but this is not recommended in production.
`;

  static args = [{
    name: 'name',
    required: false,
    description: 'The name of the consumer to start',
  }]

  static flags = {
    config: Flags.string({
      summary: 'location of config file (defaults to \'config.yaml\').',
      char: 'c',
      default: 'config.yaml',
    }),
    all: Flags.boolean({
      char: 'a',
      description: 'Start all consumers instead of just one (not recommended, but can be useful in dev)',
    }),
    except: Flags.string({
      char: 'x',
      description: 'Specify a consumer that should not be started. (Requires -a/--all. Can be used multiple times)',
      multiple: true,
      dependsOn: ['all'],
    }),
    port: Flags.integer({
      char: 'p',
      description: 'Port to use for API (default 3000)',
    }),
  };

  async run() {
    const { args, flags } = await this.parse(StartConsumerCommand);
    const configPath = flags.config || 'config.yaml';
    const port = flags.port || 3000;

    const app = ArnavonApp.fromYaml(configPath);

    if (flags.all) {
      const except = flags.except || [];
      await app.startAllConsumers({ port, except });
    } else {
      if (!args.name) {
        throw new Error('The name of a consumer must be provided');
      }
      await app.startConsumer(args.name, { port });
    }

    // Quit properly on SIGINT (typically ctrl-c)
    process.on('SIGINT', async () => {
      await app.stop();
    });
    // Quit properly on SIGTERM (typically kubernetes termination)
    process.on('SIGTERM', async () => {
      await app.stop();
    });
  }
}
