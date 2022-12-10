import Command from '../../base';
import { Flags } from '@oclif/core';
import { Server, default as Arnavon } from '../../..';

export default class StartApiCommand extends Command<typeof StartApiCommand> {

  static summary = 'The REST API provides ways to push Jobs to queues, with validation'

  static flags = {
    port: Flags.integer({ char: 'p', description: 'Port to use for API (default 3000)' }),
  }

  async run() {
    const { flags } = await this.parse(StartApiCommand);
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
