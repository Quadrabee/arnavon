import { Flags, Command } from '@oclif/core';
import { Server, Config, default as Arnavon } from '../../..';

export default class StartApiCommand extends Command {

  static summary = 'The REST API provides ways to push Jobs to queues, with validation'

  static flags = {
    config: Flags.string({
      summary: 'location of config file (defaults to \'config.yaml\').',
      char: 'c',
      default: 'config.yaml',
    }),
    port: Flags.integer({ char: 'p', description: 'Port to use for API (default 3000)' }),
  }

  async run() {
    const { flags } = await this.parse(StartApiCommand);
    const configPath = flags.config || 'config.yaml';

    const config = Config.fromFile(configPath);
    Arnavon.init(config);

    const port = flags.port || 3000;
    const server = new Server(Arnavon.config);
    server.start(port);
    // Quit properly on SIGINT (typically ctrl-c)
    process.on('SIGINT', () => {
      server.stop();
    });
    // Quit properly on SIGTERM (typically kubernetes termination)
    process.on('SIGTERM', () => {
      server.stop();
    });
  }
}
